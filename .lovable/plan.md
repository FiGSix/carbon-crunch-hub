
# Fix: 214 incorrect Super Partners

## What I found

| Table | super_partner | agent | client | admin |
|---|---|---|---|---|
| `profiles.role` | **214** | 2 | (clients role) | 2 |
| `user_roles.role` | 214 | 84 | 129 | 4 |

- 213 of the 214 "super partners" own **zero** linked companies.
- 127 of them have a row in `clients` (i.e. they are actually system-owner clients).
- The three you actually want as super partners are already correct:
  - `shaun.slabber.africa@gmail.com` — role=agent, suspended (already demoted)
  - `brian.hosking@vitalista.co.za` — role=super_partner, active ✓
  - `shaun@nuvoconsulting.com` — role=agent, suspended (already demoted)

## Root cause

`supabase/functions/create-super-partner/index.ts` (lines 143-169) does a `profiles.upsert({ role: 'super_partner', ... }, { onConflict: 'id' })` **after** looking up an existing auth user by email. If the email already belongs to a client or agent, that user's `role` is silently overwritten to `super_partner`, and a `super_partner` row is inserted into `user_roles`. The admin "Add Super Partner" dialog has been hitting existing users, flipping clients/agents into super partners en masse. No `user_role_audit` entries were created because the function bypasses the audit trigger.

## Plan

### 1. Patch the edge function (root cause)

In `supabase/functions/create-super-partner/index.ts`, when an existing auth user is found:
- **Do not** upsert role.
- Return a 409 with a clear error: "User already exists with role X — use the Super Partner upgrade flow instead."

Only when a brand-new auth user is created should we set `role='super_partner'`. For promoting an existing agent, the admin should use the existing `upgrade_agent_to_super_partner(uuid)` RPC (already in the DB), and we should surface that as a separate "Promote existing user" button in `AdminSuperPartnerManagement.tsx`.

### 2. Migration — restore correct roles

Single migration that, for every profile where `role='super_partner'` AND `id NOT IN` the 3 keepers (Brian, plus the two Shauns who are already agents — they will be skipped by the filter anyway):

1. Compute the user's **true** role using this priority:
   - If `EXISTS (SELECT 1 FROM clients WHERE user_id = p.id)` → `'client'`
   - Else if `EXISTS (SELECT 1 FROM company_members WHERE user_id = p.id AND role IN ('agent','team_lead'))` OR `EXISTS (SELECT 1 FROM agent_invitations WHERE lower(email)=lower(p.email) AND status='accepted')` → `'agent'`
   - Else → `'client'` (safe default; they can be re-promoted manually)
2. `UPDATE profiles SET role = <true_role>, super_partner_status = NULL, can_create_proposals = false`.
3. `DELETE FROM user_roles WHERE role = 'super_partner' AND user_id NOT IN (<3 keepers>)`.
4. `INSERT INTO user_roles (user_id, role) VALUES (..., <true_role>) ON CONFLICT DO NOTHING`.
5. For each affected user, insert a `user_role_audit` row (`action='removed', role='super_partner'`) + (`action='added', role=<true_role>`) so the change is traceable.
6. `UPDATE companies SET super_partner_id = NULL, super_partner_linked_at = NULL, super_partner_linked_by = NULL WHERE super_partner_id NOT IN (<3 keepers>)` so orphaned links don't leave dangling references. (Brian is the only keeper currently in the DB, since the two Shauns are agents.)
7. Existing `super_partner_commissions` rows are **preserved** (historical record).

### 3. Verify

Re-run the role distribution query and confirm:
- `profiles.role='super_partner'` count = **1** (Brian)
- `user_roles.role='super_partner'` count = **1**
- All previously-mislabelled clients/agents show their corrected role on next login.

### 4. Admin UI cleanup

`AdminSuperPartnerManagement.tsx`:
- Show a clear "Promote existing user to Super Partner" option that calls `upgrade_agent_to_super_partner` instead of `create-super-partner`.
- "Add Super Partner" stays for genuinely new accounts only.

## Risks

- The "true role" inference for users with no clients/agent signals defaults to `'client'`. A handful of legitimate agents who were never properly recorded as agents may need manual re-promotion afterwards. I will print a list of those edge cases in the migration output for review.
- Anyone currently logged in as super_partner will lose access on their next session — expected and desired.

## Files touched

- `supabase/functions/create-super-partner/index.ts` — refuse to mutate existing users
- `supabase/migrations/<new>.sql` — the role-restoration script + audit logging
- `src/pages/AdminSuperPartnerManagement.tsx` — add explicit "Promote existing user" path
