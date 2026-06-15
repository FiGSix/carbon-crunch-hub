Root issue found: recent Supabase Edge HTTP logs show every `create-super-partner` POST returning `401`. The function currently checks for an Authorization header, but then calls `userClient.auth.getUser()` without explicitly passing the JWT. Other working admin functions in this project extract the bearer token and verify it with `auth.getUser(token)`, usually via a service-role client.

Plan:

1. Update `supabase/functions/create-super-partner/index.ts`
   - Extract the JWT from `Authorization: Bearer ...`.
   - Verify it with the service-role Supabase client using `admin.auth.getUser(token)`, matching the project’s working edge-function pattern.
   - Return clearer 401 errors for missing/invalid/expired sessions.
   - Check admin permission directly against `profiles`/`user_roles` using the verified `user.id`, instead of relying on an RPC tied to request context.
   - Keep service-role-only operations server-side.

2. Harden the create flow without changing behavior
   - Validate email format and normalize/trim email before invite.
   - Check required service configuration and return a clear 500 if missing.
   - Log auth/profile/invite/upsert failures server-side so future failures show useful Edge Function logs.
   - Check and return errors from `profiles.upsert()` and `user_roles.upsert()` instead of ignoring them.

3. Improve the admin page error message
   - In `src/pages/AdminSuperPartnerManagement.tsx`, surface the edge function response body when available, so the toast shows `Invalid authentication`, `Admin only`, `Invite failed`, etc. instead of only `Edge Function returned a non-2xx status code`.

4. Deploy and validate
   - Deploy `create-super-partner`.
   - Re-check Edge Function logs/statuses.
   - Test the function with a safe request path or authenticated preview session where possible, verifying the previous 401 is gone and any remaining failure is the actual invite/profile error.