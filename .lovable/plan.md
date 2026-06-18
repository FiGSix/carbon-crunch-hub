
## What's going wrong

Two separate bugs are colliding for `projects@energygurus.co.za` (Elize Vuyk).

### Bug 1 — She was promoted to Super Partner by accident

She signed up as a normal **agent** (her `auth.users.raw_user_meta_data.role = 'agent'`, and `handle_new_user` correctly inserted `role = 'agent'`).

She became a Super Partner because of the `sync_super_partner_status` trigger on `public.profiles`:

```sql
ELSIF NEW.super_partner_status = 'active' THEN
  IF NEW.role IS DISTINCT FROM 'super_partner' THEN
    UPDATE public.profiles SET role = 'super_partner' WHERE id = NEW.id;
    NEW.role := 'super_partner';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_partner') ...;
END IF;
```

Two problems with that trigger:

1. It **auto-promotes any user** whose `super_partner_status` is flipped to `'active'`, even an agent or client. The status field was never meant to be a back-door promotion switch — only `upgrade_agent_to_super_partner` should promote.
2. When it does promote, it **never removes the old `agent` role** from `user_roles`. Her row in `user_roles` now contains BOTH `agent` and `super_partner` (confirmed in DB), which breaks role-based UI and policy checks.

Combined with the fact that an admin (or some code path) set `super_partner_status='active'` on her profile, the trigger silently turned her into a Super Partner.

### Bug 2 — Her company was not linked on signup

She was invited via the **team-invitation** flow:

- `team_invitations` row exists for her, with `company_id = 76d9fed6` (The Energy Gurus), `status = 'pending'`, `accepted_at = NULL`.
- `agent_invitations` has nothing for her.

But `handle_new_user` only looks at `agent_invitations` when deciding which company to link, and `mark_invitation_accepted_on_profile_creation` only marks `agent_invitations` as accepted. So after her signup:

- her `team_invitations` row stayed `pending` forever,
- no `company_members` row was created automatically,
- an admin had to manually link her to The Energy Gurus 30 minutes later (which is where the Super Partner promotion probably also happened, by whichever admin action flipped `super_partner_status`).

## Fix

### 1. Stop `sync_super_partner_status` from silently promoting agents/clients

Rewrite the trigger so it only **enforces** Super Partner status changes for users who are already Super Partners; it must not promote anyone. Promotion stays the exclusive job of `upgrade_agent_to_super_partner` (which correctly deletes the `agent` role).

New behaviour:
- `super_partner_status = 'suspended'` on a user whose role is `super_partner` → demote to `agent` (existing behaviour).
- `super_partner_status = 'active'` → **only** re-insert `super_partner` into `user_roles` if `profiles.role` is already `super_partner`. Do **not** flip `role` from `agent`/`client` to `super_partner`. If the field is flipped on a non-SP, do nothing (and log a warning via `RAISE NOTICE`).
- Also: when promotion does happen through the correct path, ensure no leftover `agent` row remains in `user_roles` (defensive `DELETE`).

### 2. Repair Elize's account (one-off data fix in the same migration)

- Set `profiles.role = 'agent'`, `super_partner_status = NULL`, `can_create_proposals = false` for `e4762177-cd64-46ce-a745-adebec47e621`.
- Delete the stray `user_roles` row `(user_id, role='super_partner')` for her.
- Keep her `company_members` row in The Energy Gurus (that part is correct — she's an agent in the company).
- Mark her `team_invitations` row as `accepted`.

### 3. Make team invitations auto-link the company on signup

Extend `handle_new_user` so that, after the existing `agent_invitations` lookup, it also:

1. Looks up the most recent **pending, non-expired** row in `team_invitations` for `NEW.email`.
2. If found and `user_role = 'agent'`:
   - Inserts a `company_members` row `(company_id, NEW.id, 'agent', 'active', invited_by=invited_by, approved_by=invited_by, now(), now())` `ON CONFLICT DO NOTHING`.
   - Marks the `team_invitations` row `status='accepted', accepted_at = NEW.created_at`.

Also extend `mark_invitation_accepted_on_profile_creation` to update `team_invitations` (same `LOWER(TRIM(email))` + pending + not-expired filter) so the invitations list stops showing perpetual "pending" rows.

### 4. Audit existing accidentally-promoted accounts (read-only check, no auto-fix)

Run a one-time query in the same migration to log (via `RAISE NOTICE`) any other profiles where `role='super_partner'` AND `user_roles` still contains an `agent` row — these were promoted by the same buggy trigger. We surface the list so the admin can review/repair manually; we do not auto-demote them (could be legitimate Super Partners created by `create-super-partner` plus a stale audit row).

## Out of scope

- No changes to the carbon calculation, referral landing page, edge functions other than what's described, or to `upgrade_agent_to_super_partner` (already correct).
- No frontend UI changes (admin Super Partner page stays as-is).
- No new tables or columns. Only trigger/function rewrites and one data repair.

## Technical details

Files touched:
- New migration:
  - `CREATE OR REPLACE FUNCTION public.sync_super_partner_status()` — non-promoting version.
  - `CREATE OR REPLACE FUNCTION public.handle_new_user()` — adds `team_invitations` lookup + company_members insert.
  - `CREATE OR REPLACE FUNCTION public.mark_invitation_accepted_on_profile_creation()` — also marks `team_invitations`.
  - Data repair `UPDATE`/`DELETE` for Elize's profile/user_roles/team_invitations.
  - `DO $$ ... RAISE NOTICE ... $$` block listing other profiles with dual `agent`+`super_partner` roles.

No `GRANT` changes needed (no new tables).
