Fix the failing `create-super-partner` invite.

What the logs show:
- The function authenticates the admin and reaches `admin.auth.admin.inviteUserByEmail(...)`.
- That call throws `AuthRetryableFetchError: {}` with `status: 500, code: undefined`, originating in `gotrue-js` loaded via `https://esm.sh/@supabase/supabase-js@2.38.4`. This is a runtime/transport failure inside the Supabase JS auth-admin call.
- The UI toast shows `{}` because we serialize the empty auth error.

Plan:

1. Switch the Supabase JS import in `supabase/functions/create-super-partner/index.ts` from `https://esm.sh/@supabase/supabase-js@2.38.4` to the stable `npm:@supabase/supabase-js@2` specifier (the same pattern used by working functions in this project).

2. Replace `inviteUserByEmail` with a more reliable two-step flow that works around the gotrue-js transport issue and is also idempotent for re-invites:
   - First check if a user with that email already exists via `admin.auth.admin.listUsers` filtering by email.
   - If not, create the user with `admin.auth.admin.createUser({ email, email_confirm: false, user_metadata: { role: "super_partner", ... } })`.
   - Then call `admin.auth.admin.generateLink({ type: "invite", email })` to produce an invite link (Supabase will email it when SMTP is configured; the link is also returned for fallback).
   - If the user already existed, skip create and just (re)generate the invite link.

3. Always extract a clean error string from gotrue errors (`err.message || err.code || JSON.stringify(err)`) so the UI never shows `{}`.

4. Keep the existing profiles + user_roles upsert logic, the admin auth check, and CORS exactly as they are.

5. Deploy the function and re-test by attempting to create a super partner from the admin UI; verify the Edge Function logs no longer show `AuthRetryableFetchError` and the new row appears in `profiles` + `user_roles`.

Technical notes:
- No DB migration needed.
- No frontend changes required beyond what is already in place (the toast already surfaces `error` from the function body).
- Behavior change: invitation email delivery now depends on Supabase Auth SMTP being configured for the project; if SMTP is not configured, the user is still created and an invite link is generated server-side (logged) — we can extend later to send via Resend if needed.