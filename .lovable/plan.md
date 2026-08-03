## Diagnosis (confirmed)

Grahame's team data is fine in the database — New Planet Energy (Pty) Ltd has 4 active members (Grahame and Perfect as account admins, Lutendo and Tumelo as members).

The problem is permissions on the `profiles` table. Its read rule is: **you can only read your own profile, unless you are an admin**. The client team page loads the member rows (which works), then does a second lookup of names/emails from `profiles` — that lookup returns nothing for everyone except Grahame himself, so the UI falls back to blank names and "?" initials.

The agent/partner side of the app already solved this with a secure server-side helper (`get_company_member_profiles`). The client side never got the equivalent, so it queries `profiles` directly and hits the wall.

## Fix

1. **Add a secure server-side function** `get_client_company_member_profiles(company_id, requesting_user_id)`:
   - Verifies the caller is an active member of that client company (or an admin); otherwise it errors.
   - Returns only safe fields for that company's members: id, first name, last name, email, avatar.
   - Mirrors the existing agent-side function exactly, so behaviour and security posture stay consistent.

2. **Update the client team data layer** (`src/lib/supabase/clientCompany/clientCompanyOperations.ts`) to call this function instead of selecting from `profiles` directly — in both the member list and the pending-approvals list. Also fix the invitations lookup that resolves inviter names the same way.

3. No changes to the `profiles` access rules themselves — nothing is widened, the function is the only new read path and it is scoped to one company.

## Verification

- Sign in as a New Planet Energy member and confirm the Team Management page shows all four names, initials, emails and role badges.
- Confirm a user from another client company still cannot read New Planet's members.

## Technical notes

- New function is `SECURITY DEFINER`, `STABLE`, `SET search_path = public`, with an explicit membership check plus `is_current_user_admin()` fallback, and skips soft-deleted profiles.
- Requires one database migration; the rest is frontend data-layer changes only.
