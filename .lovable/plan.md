## Problem

Shaun (`shaun@nuvoconsulting.com`) is `super_partner_status = 'suspended'` but still has `profiles.role = 'super_partner'` and a `super_partner` row in `user_roles`, so every route guard and sidebar entry still treats him as a Super Partner.

Two root causes:

1. **Data drift** — his suspension predates (or bypassed) the downgrade logic in `AdminSuperPartnerManagement.setStatus`, so his role was never flipped.
2. **Incomplete downgrade logic** — `setStatus` deletes the `super_partner` row from `user_roles` but never inserts an `agent` row, leaving suspended users with no `user_roles` entry. It also relies entirely on the admin clicking the button — there's no DB-level guarantee that `super_partner_status = 'suspended'` ⇒ role is `agent`.

## Fix

### 1. Database trigger (source of truth)

Add `sync_super_partner_status()` trigger on `profiles` (AFTER INSERT OR UPDATE OF `super_partner_status`):

- When `super_partner_status = 'suspended'`:
  - `UPDATE profiles SET role = 'agent'` (if currently `super_partner`)
  - `DELETE FROM user_roles WHERE user_id = NEW.id AND role = 'super_partner'`
  - `INSERT INTO user_roles (user_id, role) VALUES (NEW.id, 'agent') ON CONFLICT DO NOTHING`
- When `super_partner_status = 'active'` (and previously suspended):
  - `UPDATE profiles SET role = 'super_partner'`
  - `INSERT INTO user_roles (user_id, role) VALUES (NEW.id, 'super_partner') ON CONFLICT DO NOTHING`
  - (leave the `agent` row in place — harmless, and means demotion later still has a fallback role)

This guarantees the two tables can never drift again, regardless of how the status is changed.

### 2. Backfill Shaun + any other drifted rows

Single statement that re-applies the rule to every existing row:

```sql
UPDATE profiles
SET super_partner_status = super_partner_status
WHERE super_partner_status IN ('suspended','active');
```

The trigger then corrects `profiles.role` and `user_roles` for Shaun and anyone else in the same state. Verify afterwards with a `SELECT` on Shaun's row.

### 3. Clean up `AdminSuperPartnerManagement.setStatus`

Now that the trigger owns the sync, the page handler only needs to update `super_partner_status`. Remove the manual `role` update and the manual `user_roles` insert/delete (lines 177-196). Keeps the UI in line with the "fix at the root, no patched layers" guideline.

### 4. Defense-in-depth UI guard (small)

In `DashboardSidebar.tsx` and `DashboardLayout.tsx` (`requiredRole` check), additionally hide/redirect Super Partner items when `profile.super_partner_status === 'suspended'`. Belt-and-braces in case the trigger is ever bypassed; no behaviour change for normal accounts.

`AuthContext` already exposes `profile.super_partner_status`, so no schema or context changes are needed.

## Technical notes

- Trigger is `SECURITY DEFINER` with `SET search_path = public` so it can write to `user_roles` regardless of caller RLS.
- Uses `ON CONFLICT (user_id, role) DO NOTHING` to be idempotent (the table already has that unique constraint).
- No changes to the `app_role` enum, RLS policies, or `has_role()`.
- Existing profile cache TTL is 5 s, so Shaun will see the change on his next request after the backfill runs.

## Out of scope

- Notifying the affected user
- Auditing who suspended them (already covered by `user_role_audit` going forward once the trigger writes through `manage-user-role`-style flows — not changing that here)