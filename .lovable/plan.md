## Goal
Remove the "Account Suspended" screen for Super Partners. When an SP is suspended, they should simply continue as a regular agent on next login — no banner, no redirect.

## Changes

### 1. `src/components/layout/DashboardLayout.tsx`
Remove the suspension guard block (lines ~83-104) that renders the "Account Suspended" screen. No replacement UI — suspended SPs just keep using the app under whatever role they have.

### 2. Ensure suspension downgrades role to `agent`
Need to verify how suspension is performed today (admin UI / SQL). Two options:

- **Option A (preferred, no DB change):** Update the admin "suspend super partner" action so that, in addition to setting `super_partner_status = 'suspended'`, it also sets `profiles.role = 'agent'` (and removes the `super_partner` row from `user_roles` if present). This way, on next login the user simply loads as an agent — sidebar, routes, and dashboard all reflect agent automatically with no extra gating code.
- **Option B (DB trigger):** Add a trigger on `profiles` that, when `super_partner_status` transitions to `'suspended'`, downgrades `role` to `'agent'` and syncs `user_roles`. Safer if suspension can happen from multiple code paths.

I'll go with **Option A** unless exploration shows multiple suspension code paths, in which case I'll add the trigger (Option B) as well.

### 3. No other UI changes
- Sidebar/routes already handle agent role correctly.
- The `isSuperPartner` flag in `AuthContext` will naturally become false once role is downgraded.
- Removing the SP-specific pages (My Companies / Commission) for the downgraded user happens automatically via the existing role-based nav gating.

## Out of scope
- No change to how SPs are *promoted* or how `super_partner_status` is otherwise used.
- No change to the partner referral landing page or logo work.

## Technical notes
- Need to locate the admin suspend action (likely under `src/components/admin/` or an edge function) before writing the migration/code change.
- If the role downgrade is done in the DB, also clear/replace any `user_roles` row with `role = 'super_partner'` for that user to keep `has_role()` correct.
