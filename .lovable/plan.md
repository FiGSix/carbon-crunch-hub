# Super Partners: Proposal Creation + Agent Upgrade Path

Builds on top of the in-flight `profiles_role_check` + `create-super-partner` error-handling fix. No existing behaviour changes; all new capabilities are opt-in via a per-profile flag.

## 1. Schema migration (single file)

- `ALTER TABLE profiles ADD COLUMN can_create_proposals boolean NOT NULL DEFAULT false`
- Rewrite `get_super_partner_rate(p_super_partner_id uuid)` — sum `system_size_kwp` from non-deleted signed proposals where either:
  - `agent_id` belongs to a profile with `super_partner_id = p_super_partner_id`, OR
  - `agent_id = p_super_partner_id` (SP's own proposals)
- Create `upgrade_agent_to_super_partner(p_agent_id uuid)` SECURITY DEFINER (admin-only via `is_current_user_admin()`) — updates role/status/flag, nulls `super_partner_id`, swaps role rows in `user_roles`, preserves `agent_commissions` history.

## 2. Signing-trigger update

Locate the existing trigger that writes `agent_commissions` / `super_partner_commissions` on signature:

- Treat `role = 'super_partner' AND can_create_proposals = true` identically to `role = 'agent'` for `agent_commissions` insertion (rate from existing helper on SP's own cumulative MWp — 4%/7%).
- Keep existing null-check on `profiles.super_partner_id` for `super_partner_commissions` insert. SPs always have `super_partner_id = NULL`, so no SP-commission row will be written on their own proposals — confirm in code, no special case added.
- `proposals.super_partner_id` snapshot stays `NULL` for SP-authored proposals.

## 3. Frontend: profile loading (CRITICAL — two files)

Verified `src/hooks/auth/useProfileLoader.ts` does its own explicit-column select + mapping (lines 80–112), independent of `profileOperations.ts` (`select('*')`). Both must include the new column or the sidebar gate and page early-return will see `undefined` and silently block flagged SPs:

- `src/contexts/auth/types.ts` — add `can_create_proposals?: boolean` to `UserProfile`.
- `src/hooks/auth/useProfileLoader.ts` — add `can_create_proposals` to the explicit `select(...)` list AND to the constructed profile object mapping.
- `src/lib/supabase/profile/profileOperations.ts` — `select('*')` already covers reads; verify the update path passes the column through if it ever needs to be edited from the client (admin path uses RPC/admin UI, not client update — no change required there beyond type).

## 4. Frontend: nav + routing + pages

- `src/components/layout/DashboardSidebar.tsx` — gate "Create Proposal" and "My Clients" SP entries on `profile.role === 'super_partner' && profile.can_create_proposals === true`. Agents/admins unchanged.
- Route guard (`src/App.tsx` or wrapper) — add `'super_partner'` to `allowedRoles` for `/create-proposal` and `/my-clients`.
- `src/pages/CreateProposal.tsx` and `src/pages/MyClients.tsx` — early-return a shared "Access not enabled — contact your administrator" empty state when `profile.role === 'super_partner' && !profile.can_create_proposals`. Agent/admin paths untouched.

## 5. Admin UI

- `AdminSuperPartnerManagement` detail drawer — Switch labelled "Allow direct proposal creation" bound to `can_create_proposals`; persists via existing update path (admin RLS already allows profile updates).
- `AdminAgentManagement` active-agents row actions — "Upgrade to Super Partner" behind a confirmation dialog with the exact warning copy from the spec; calls `supabase.rpc('upgrade_agent_to_super_partner', { p_agent_id })`; on success invalidates agent + SP queries so the row migrates tabs.

## 6. Verification

1. Upgrade an agent previously linked to an SP → `super_partner_id` null, role flipped, `user_roles` swapped, proposals/commissions intact, removed from former SP's linked-agents list.
2. SP with flag creates + signs a proposal → exactly one `agent_commissions` row at correct tier, zero `super_partner_commissions` rows, `proposals.super_partner_id = null`, and the proposal's MWp counts in `get_super_partner_rate()` for that SP.
3. SP without flag visits `/create-proposal` / `/my-clients` → "Access not enabled" renders (not blank, not 403).
4. `get_super_partner_rate()` combines SP's own MWp + linked agents' MWp into the correct tier (3% / 5%).
5. Reload an SP profile in-app → confirm `profile.can_create_proposals` is present (not `undefined`) in React DevTools / console.

## Technical notes

- New SPs created via `create-super-partner` edge function get `false` by default (column default applies — no edge-function code change).
- `get_super_partner_rate` uses `UNION ALL` or `OR` join clause; existing rate thresholds unchanged.
- No data backfill required.
