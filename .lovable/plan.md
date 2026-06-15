# Super Partner (B2B2B) — Implementation Plan (revised)

Single source of truth combining the original role/scaffolding plan with the consolidated revenue-model spec. Revised to add `agent_invitations` handling and the `super_partner_link_requests` table to the migration.

## 1. Database migration (one migration)

### Enum + profile columns
- `ALTER TYPE app_role ADD VALUE 'super_partner'` (must commit before any DML uses it — separate statement at top of migration).
- `profiles` additions:
  - `super_partner_id uuid REFERENCES profiles(id)` (nullable)
  - `super_partner_commission_rate numeric` (display cache only, never drives calc)
  - `super_partner_status text DEFAULT 'active'`

### Proposals snapshot columns
```sql
ALTER TABLE proposals
  ADD COLUMN super_partner_id uuid REFERENCES profiles(id),
  ADD COLUMN super_partner_commission_percentage numeric DEFAULT 0,
  ADD COLUMN platform_fee_percentage numeric,
  ADD COLUMN platform_fee_override boolean DEFAULT false;
```

### `agent_invitations` (verify-or-create)
First check whether `public.agent_invitations` exists.
- **If it exists**: `ALTER TABLE public.agent_invitations ADD COLUMN super_partner_id uuid REFERENCES profiles(id);` Leave all other columns and policies untouched.
- **If it does not exist**: create it in this migration with: `id uuid PK`, `email text NOT NULL`, `super_partner_id uuid REFERENCES profiles(id)`, `invited_by uuid REFERENCES profiles(id)`, `status text DEFAULT 'pending'`, `created_at timestamptz DEFAULT now()`, `expires_at timestamptz`. Include GRANTs + RLS (admins full; super partners INSERT/SELECT own; invited email can SELECT own row by token if existing invite pattern requires it).

On agent signup, if the invitation row carries `super_partner_id`, set `profiles.super_partner_id` at profile creation.

### New table `super_partner_commissions`
Mirrors `agent_commissions` plus `super_partner_id`. Columns: `id, super_partner_id, agent_id, proposal_id, commission_rate, commission_amount, commission_status, calculated_at, approved_at, approved_by, paid_at, notes, created_at, updated_at`.

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.super_partner_commissions TO authenticated;
GRANT ALL ON public.super_partner_commissions TO service_role;
ALTER TABLE public.super_partner_commissions ENABLE ROW LEVEL SECURITY;
```
RLS: admins full; super partner `SELECT` where `super_partner_id = auth.uid()`; agents no access.

### New table `super_partner_link_requests`
```sql
CREATE TABLE public.super_partner_link_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  super_partner_id uuid REFERENCES profiles(id) NOT NULL,
  agent_id uuid REFERENCES profiles(id) NOT NULL,
  request_type text NOT NULL,         -- 'link' or 'unlink'
  status text DEFAULT 'pending',      -- 'pending' | 'approved' | 'rejected'
  requested_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id),
  notes text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.super_partner_link_requests TO authenticated;
GRANT ALL ON public.super_partner_link_requests TO service_role;
ALTER TABLE public.super_partner_link_requests ENABLE ROW LEVEL SECURITY;
```
RLS: admins full; super partners may `INSERT` and `SELECT` rows where `super_partner_id = auth.uid()`; agents no access.

### RLS on existing tables
- `profiles`: super partner can `SELECT` rows where `super_partner_id = auth.uid()`. Agents cannot read/write `super_partner_id`, `super_partner_commission_rate`, `super_partner_status` — enforced by `BEFORE UPDATE` trigger blocking non-admin writes to those columns.
- `user_roles`: allow `super_partner` role rows under same admin-managed policy as agents.

### system_settings seeds
Insert (if not present): `super_partner_mwp_tier1_threshold = 20`, `super_partner_rate_tier1 = 3`, `super_partner_rate_tier2 = 5`.

### Functions (all `SECURITY DEFINER`, `SET search_path = public`)
- `get_super_partner_rate(p_super_partner_id uuid) returns numeric` — sums `system_size_kwp` across non-deleted signed proposals for all agents where `profiles.super_partner_id = p_super_partner_id`; returns tier2 rate if MWp ≥ tier1 threshold, else tier1 rate, else 0. Reads thresholds from `system_settings`.
- `create_super_partner_user(...)` — admin-only, mirrors `create_agent_user`.
- `get_super_partner_dashboard_stats()` / `get_super_partner_agents()` — for SP UI.
- `backfill_super_partner_commissions(p_agent_id, p_super_partner_id)` — inserts `super_partner_commissions` for every historical signed proposal by the agent, using `get_super_partner_rate()` evaluated at backfill time, `notes = 'backfilled'`. **Does not touch `agent_commissions`.**
- `recalc_proposal_platform_fee(p_proposal_id uuid)` — recomputes `platform_fee_percentage = 100 - client_share - agent_commission - super_partner_commission`; sets `platform_fee_override = true` when invoked from admin edit context.

### Trigger on proposal signing
AFTER UPDATE on `proposals`, fires when `signed_at` transitions NULL → value (same condition as existing `trigger_create_onboarding`):
1. Look up agent's `profiles.super_partner_id`.
2. If set: compute rate via `get_super_partner_rate()`, write `proposals.super_partner_id` + `super_partner_commission_percentage`, insert `super_partner_commissions` row (status `pending`).
3. Always: insert `agent_commissions` row with `base_rate` (4/7), `override_rate` (`profiles.commission_override`), `final_rate`, `commission_amount = final_rate/100 * revenue_basis`, status `pending`. Revenue basis = same field used by existing agent dashboard commission display — confirm exact field in build-mode explore step before wiring.
4. Compute and write `proposals.platform_fee_percentage`.

Admin edits to `client_share_percentage`, `agent_commission_percentage`, or `super_partner_commission_percentage` on a signed proposal → call `recalc_proposal_platform_fee` and set `platform_fee_override = true`.

## 2. Edge functions
- `create-super-partner` (admin-gated, wraps `create_super_partner_user`).
- `accept-proposal` core sequence unchanged — all new behaviour lives in the DB trigger.

## 3. Frontend

### Types & auth
- Extend `UserRole` in `src/contexts/auth/types.ts` with `'super_partner'`.
- Add `isSuperPartner` flag in `AuthContext`.
- Post-login redirect: `super_partner` → `/super-partner/dashboard`.
- Audit all `<PrivateRoute allowedRoles={...}>` — do NOT add `super_partner` to existing routes.

### New routes (lazy-loaded in `App.tsx`)
- `/admin/super-partners` → `AdminSuperPartnerManagement`
- `/super-partner/dashboard` → `SuperPartnerDashboard`
- `/super-partner/my-agents` → `SuperPartnerMyAgents`
- `/super-partner/commission` → `SuperPartnerCommission`
- `/super-partner/profile`, `/super-partner/notifications` (reuse existing where possible)

### Admin Super Partner Management
- Table: company, contact, email, status, current aggregated MWp, current rate tier (live from `get_super_partner_rate`), # linked agents, joined.
- "Add Super Partner" modal → edge function.
- Detail drawer: edit name/company/contact/status. Rate display-only.
- Suspend/remove: sets status `suspended`, nulls `super_partner_id` on all linked agents, preserves commission rows.
- Agent allocation panel: linked agents with MWp + proposal count; "Add Agent" searchable dropdown of unlinked agents → sets `super_partner_id` + calls `backfill_super_partner_commissions`; "Remove Agent" nulls `super_partner_id`, preserves commissions, appends note.
- **Link-request queue**: review `super_partner_link_requests` rows; approve → apply link/unlink + backfill where applicable; reject → mark rejected with note.

### Super Partner UI
- **Dashboard**: stats cards (total agents, aggregated MWp, current tier rate, pending/paid commission totals).
- **My Agents**: aggregated stats only — name, company, email, agent_status, MWp contributed, proposal count, date linked. No client PII, no proposal details.
  - "Invite new agent by email" → standard agent invitation flow, writes `super_partner_id` on the `agent_invitations` row so signup auto-links.
  - "Request to link existing agent" → inserts a `super_partner_link_requests` row (`request_type='link'`, status `pending`). Admin must approve before `super_partner_id` is set.
  - "Remove agent" → inserts `super_partner_link_requests` row (`request_type='unlink'`, status `pending`); no immediate effect.
- **Commission**: read-only list of `super_partner_commissions` with status chips.
- **Profile / Notifications**: reuse existing.

### Admin nav
Add "Super Partners" alongside existing "Agent Management".

### Agent nav / UI
**No changes whatsoever.** RLS blocks agents from selecting `super_partner_id` on their own profile.

## 4. System Settings page
Add "Super Partner Commission Tiers" section to `/system-settings` admin page with inputs for the three new keys. All SP rate logic (DB function + any UI display) reads from `system_settings` at runtime — no hardcoded values.

## 5. Constraints preserved
- `unifiedProposalService.ts` and `pricing.ts` client/agent tier values untouched.
- `commission_override` precedence unchanged.
- `accept-proposal` edge function core sequence unchanged.
- No regressions to existing client/agent/admin flows.

## Out of scope
- Super-partner-initiated immediate agent removal (admin-gated only).
- Payout / withdrawal flows.
- Historical `agent_commissions` backfill (admin handles manually).
- Editing super partner commission rate from any UI (always computed).

## Technical notes for build phase
- Enum addition must be its own statement before any function/policy uses the literal.
- Build-mode explore step: confirm `agent_invitations` existence + columns, and confirm the exact revenue-basis field used by existing agent commission UI before wiring `agent_commissions.commission_amount`.
- Admin-edit recalc: implement as a small RPC + call it from admin proposal-edit save handlers.
- All new SQL: `SECURITY DEFINER`, `SET search_path = public`.
