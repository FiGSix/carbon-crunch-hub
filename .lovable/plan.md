## Diagnosis

`create-super-partner` fails because `admin.auth.admin.createUser()` triggers `public.handle_new_user()`, which inserts into `public.profiles` with `role = 'super_partner'`. The `profiles.role` check constraint is stale and only allows `client | agent | admin`, so Postgres rejects the insert. Supabase Auth surfaces this as an opaque `AuthRetryableFetchError: {}`.

Auth log confirms:

```text
new row for relation "profiles" violates check constraint "profiles_role_check"
```

## Drift check (other tables)

I ran the broader scan you asked for. Only one table has a stale hardcoded role list:

```text
profiles.profiles_role_check  -> CHECK (role IN ('client','agent','admin'))   STALE
```

The other role-bearing constraints are unrelated vocabularies and do NOT need changes:

```text
company_members.company_members_role_check               -> ('team_lead','member')
client_company_members.client_company_members_role_check -> ('account_admin','member')
user_role_audit.user_role_audit_action_check             -> ('added','removed')
user_roles.role                                          -> uses app_role enum directly (super_partner already in enum)
```

So one migration fixes everything.

## Plan

1. **Migration — fix the stale constraint**
   - Drop `public.profiles_role_check`.
   - Recreate it as `CHECK (role IN ('client','agent','admin','super_partner'))`.
   - No data backfill needed (no profile rows currently violate the new constraint).

2. **Edge function — small robustness pass on `create-super-partner`**
   - Keep existing admin auth, duplicate-email lookup, and idempotent profile/user_roles upserts.
   - Improve `errMsg` so `AuthRetryableFetchError: {}` surfaces `name` + `status` instead of an empty object, making future regressions debuggable from the UI toast.
   - No changes to the SMTP / invite-link flow in this pass.

3. **Verify**
   - Try creating a super partner from Admin → Super Partner Management.
   - Confirm no new `profiles_role_check` or `AuthRetryableFetchError` entries in Auth / edge logs.
   - Confirm rows exist in `auth.users`, `public.profiles` (role = `super_partner`), and `public.user_roles` (role = `super_partner`).

## Expected result

"Create failed: {}" stops appearing, and the super partner is created in one click.