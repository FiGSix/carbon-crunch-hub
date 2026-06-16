# Super Partner linking: agent → company

Replaces every part of the existing agent-level SP relationship with company-level linking. Single PR.

## Decisions confirmed

- **Existing `profiles.super_partner_id` data**: discarded. No data migration; admins re-link companies after deploy.
- **SP-invited new agents**: join the SP-selected linked company on signup.
- **Multi-company agents**: proposals always attribute to the agent's *earliest* active `company_members` row.
- **One PR, atomic cutover.**

## Migration 1 — schema cutover

```sql
ALTER TABLE companies
  ADD COLUMN super_partner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN super_partner_linked_at timestamptz,
  ADD COLUMN super_partner_linked_by uuid REFERENCES profiles(id);

ALTER TABLE proposals
  ADD COLUMN company_id uuid REFERENCES companies(id);

ALTER TABLE super_partner_link_requests
  DROP COLUMN agent_id,
  ADD COLUMN company_id uuid NOT NULL REFERENCES companies(id);

ALTER TABLE profiles DROP COLUMN super_partner_id;
```

New RLS on `companies`: SP can `SELECT` rows where `super_partner_id = auth.uid()`. Existing agent/admin policies untouched.

## Migration 2 — `ensure_agent_has_company(p_agent_id uuid) returns uuid`

`SECURITY DEFINER`. Returns earliest active `company_members.company_id` for the agent. If none, creates a `companies` row (name = trimmed `profiles.company_name`, else `"First Last (Solo)"`) and a `company_members` row (`role='team_lead'`, `status='active'`, `invited_by`/`approved_by` = the agent).

## Migration 3 — `get_super_partner_rate(p_super_partner_id uuid)` rewrite

Aggregate MWp from `proposals` joined to `companies` on `proposals.company_id` where `companies.super_partner_id = p_super_partner_id`, `signed_at IS NOT NULL`, `deleted_at IS NULL`. Apply existing `system_settings` tier rates (0 / tier1 / tier2). SP's own proposals naturally excluded because their own company has `super_partner_id = NULL`.

## Migration 4 — `handle_proposal_signing_commissions` trigger rewrite

Trigger stays attached to the same `BEFORE INSERT/UPDATE` events on `proposals` when `signed_at` transitions to non-null.

1. If `NEW.company_id IS NULL`: call `ensure_agent_has_company(NEW.agent_id)`, assign to `NEW.company_id`.
2. Look up `companies.super_partner_id` for `NEW.company_id` → `v_sp_id`.
3. Compute **agent commission tier from company MWp**: `SUM(system_size_kwp)` over signed non-deleted proposals with `company_id = NEW.company_id` (excluding `NEW` if pre-insert). `< 15000 → 4%`, else `7%`. `profiles.commission_override` still wins when set.
4. Snapshot `NEW.agent_portfolio_kwp = <that company total>` (semantics change: now company MWp, not agent MWp — accepted; downstream display components keep working with the new meaning).
5. If `v_sp_id IS NOT NULL`: call `get_super_partner_rate(v_sp_id)`, snapshot `NEW.super_partner_id`, `NEW.super_partner_commission_percentage`, insert `super_partner_commissions` row.
6. Recompute `platform_fee_percentage` unless `platform_fee_override = true` (unchanged).
7. Always insert `agent_commissions` row (unchanged shape).

## Migration 5 — `backfill_super_partner_commissions(p_super_partner_id uuid)` rewrite

Drop the old two-arg signature. New signature takes only the SP id. Loops over all signed, non-deleted proposals where `company_id` joins to a company with `super_partner_id = p_super_partner_id`. For each: insert missing `super_partner_commissions` row, refresh proposal snapshots (`super_partner_id`, `super_partner_commission_percentage`, `platform_fee_percentage`), respect `platform_fee_override`. Admin-only guard via `is_current_user_admin()`.

## Migration 6 — `request_company_link(p_company_id uuid)` RPC

Replaces `request_agent_link_by_email`. Validates caller `is_super_partner()`, inserts `super_partner_link_requests` row with `super_partner_id = auth.uid()`, `company_id = p_company_id`, `request_type='link'`, `status='pending'`. Update RLS on `super_partner_link_requests` to match new shape.

**Build-time check**: before creating `request_company_link`, verify `is_super_partner()` exists in the live DB (`SELECT proname FROM pg_proc WHERE proname='is_super_partner'`). If missing, define it in the same migration:

```sql
CREATE OR REPLACE FUNCTION public.is_super_partner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_partner'
  )
$$;
```

## Migration 7 — `upgrade_agent_to_super_partner` patch

Add `PERFORM ensure_agent_has_company(p_agent_id);` at the top before the role update. Promoted SP owns their own company (with `super_partner_id = NULL` on that company) so their own proposals don't count toward their own SP commission.

## Migration 8 — `send-agent-invitation` + `handle_new_user`

- Add `target_company_id` to `agent_invitations`. Keep existing `super_partner_id` column.
- `send-agent-invitation` edge function: when caller is an SP, require `target_company_id` (must be a company linked to that SP), store it on the invitation.
- `handle_new_user` trigger: if invitation has `target_company_id`, insert a `company_members` row (`role='agent'`, `status='active'`) for the new user under that company. Drop any code that wrote `profiles.super_partner_id` (column no longer exists).

## Migration 9 — historical `proposals.company_id` backfill

For each proposal where `company_id IS NULL AND agent_id IS NOT NULL`:
- Set to the earliest `company_members` row for that agent with `status='active' AND created_at <= proposals.created_at`.
- If none, call `ensure_agent_has_company(proposal.agent_id)` and use the returned id.

Run once at end of migration set. Does NOT touch `super_partner_id`/commission snapshots on historical proposals — historical attribution is preserved.

## Migration 10 — `get_super_partner_companies()` RPC

New `SECURITY DEFINER` function. Callable by `super_partner` (filtered to `auth.uid()`) or `admin` (sees all SPs — admin variant takes optional `p_super_partner_id` arg). Returns one row per linked company with a nested `members` JSON array, mirroring the shape `get_super_partner_agents` returned so the UI swap is a drop-in.

Per-company columns:
- `company_id` (uuid)
- `company_name` (text)
- `super_partner_linked_at` (timestamptz)
- `active_member_count` (int) — `COUNT(company_members) WHERE status='active'`
- `total_signed_mwp` (numeric) — `SUM(proposals.system_size_kwp)/1000` where `signed_at IS NOT NULL AND deleted_at IS NULL AND company_id = c.id`
- `members` (jsonb) — aggregated array of:
  - `user_id`, `first_name`, `last_name`, `email`, `role`, `status`
  - `signed_mwp` — that member's `SUM(system_size_kwp)/1000` over signed non-deleted proposals with `company_id = c.id AND agent_id = member.user_id`
  - `proposal_count` — that member's count of signed non-deleted proposals with `company_id = c.id`

Filter: `companies.super_partner_id = auth.uid()` for SP callers; admin sees all (or argument-scoped). Drop the old `get_super_partner_agents` function in the same migration.

## Frontend changes

### `src/services/proposals/unifiedProposalService.ts`
- Before computing portfolio, call `supabase.rpc('ensure_agent_has_company', { p_agent_id: agentId })` → `companyId`.
- Replace agent-MWp aggregation with company-MWp aggregation: `SUM(system_size_kwp)` where `company_id = companyId`, signed non-deleted. `commission_override` still wins.
- Write `company_id: companyId` and the company-MWp-derived `agent_portfolio_kwp` into the insert payload.

### Auth / types
- `src/contexts/auth/types.ts`: drop `super_partner_id` from `UserProfile`. Keep `super_partner_status`.
- `src/contexts/auth/AuthContext.tsx`: remove `super_partner_id` from `select(...)` and mapping.

### Admin SP page — `src/pages/AdminSuperPartnerManagement.tsx`
- Rebuild the per-SP detail panel from scratch (component rebuild rule). New panel shows:
  - Linked companies table: name, active member count, signed MWp, linked date (sourced from `get_super_partner_companies(p_super_partner_id)` admin variant).
  - "Add Company": searchable dropdown of companies where `super_partner_id IS NULL`. On confirm: `UPDATE companies SET super_partner_id, super_partner_linked_at, super_partner_linked_by` then `rpc('backfill_super_partner_commissions', { p_super_partner_id })`.
  - "Remove Company": null out the three company fields. Existing `super_partner_commissions` rows preserved.
  - Expand-row member list (read-only): agent name, role, status, individual MWp.
- Pending link requests queue shows company name instead of agent name.
- Drop all reads/writes of `profiles.super_partner_id`.

### SP "My Companies" page
- Rename file `src/pages/SuperPartnerMyAgents.tsx` → `SuperPartnerMyCompanies.tsx`. Reimplement from scratch (do not patch).
- Route in `src/App.tsx`: `/super-partner/my-agents` → `/super-partner/my-companies`.
- Sidebar entry in `src/components/layout/DashboardSidebar.tsx`: label "My Companies", new href.
- Backing data source: `supabase.rpc('get_super_partner_companies')` (no args for SP callers — function filters by `auth.uid()`).
- "Invite new agent": SP selects target company from their linked companies → call `send-agent-invitation` with `target_company_id` and `super_partner_id`.
- "Request to link existing company": searchable company dropdown → `rpc('request_company_link', { p_company_id })`.
- Remove the direct `super_partner_link_requests` insert at the current line 45-47.

### Removals
- Delete `request_agent_link_by_email` SQL function and any frontend references.
- Delete `get_super_partner_agents` SQL function (replaced by `get_super_partner_companies`).
- Drop the two-arg form of `backfill_super_partner_commissions`.

## Out of scope (explicitly unchanged)

Client share tiers, `agent_commissions` table shape and payout, `accept-proposal` edge function body, existing `companies`/`company_members`/`team_invitations` logic, `adminCompanyOperations.ts`, `useCompanyManagement`, `TeamManagement` page, SP commission rate values, `system_settings` tier thresholds, `RevenueDistributionSection` / `ClientShareCell` / `ProposalActionButtons` (they keep reading `agent_portfolio_kwp` — meaning changes from agent-level to company-level by design).

## Verification

1. Solo agent creates proposal → solo company auto-created, `proposals.company_id` set, agent rate 4%.
2. Agent in 18 MWp company creates first proposal → rate 7% from proposal #1.
3. Admin links company to SP → `companies.super_partner_id` set; `backfill_super_partner_commissions` inserts rows for that company's signed history.
4. New proposal signed by agent in SP-linked company → `super_partner_commissions` row + snapshots + correct platform fee.
5. Agent leaves company (`company_members.status` flipped) → historical proposals keep original `company_id`; SP/agent attribution unchanged.
6. SP's own proposal (created via `can_create_proposals=true`) → attributed to SP's own company which has `super_partner_id = NULL` → no SP commission, agent commission as normal.
7. SP "My Companies" page renders linked companies with expandable member sub-lists from `get_super_partner_companies()`.
8. `rg "super_partner_id" src/` shows zero matches against `profiles`; only `companies` and `agent_invitations` remain.
9. Typecheck + build pass after Supabase types regenerate.

## Risk notes

- Hard cutover on `profiles.super_partner_id`: any production SP-agent links in place today are lost. Admins must re-link companies on day one.
- `agent_portfolio_kwp` semantics change in place. Acceptable per addendum; flagged so anyone reading historical proposal snapshots understands rows written pre-cutover reflect agent MWp, rows written post-cutover reflect company MWp.
- Trigger rewrite is the highest-blast-radius change; behavioural verification (steps 1–6 above) is mandatory before merge.
