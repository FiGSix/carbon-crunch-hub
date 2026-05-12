# Fix: Client signup verification emails not being delivered

## What's actually happening

Conrad and Lauren both completed registration on the proposal page. Supabase recorded the signup attempts:
- Lauren: created 2026-05-08, `confirmation_sent_at` 2026-05-08 11:38, never confirmed
- Conrad: created 2026-03-27, `confirmation_sent_at` 2026-05-11 11:49, never confirmed

But `email_events` (the table populated by Resend webhooks) shows **zero verification emails** ever sent — only proposal/cession/contact emails. So the verification emails simply aren't being delivered through our Resend pipeline.

## Root cause

The project has a custom `supabase/functions/send-auth-email` function with branded templates (the "Welcome to the Crunch Carbon team!" email), but it is **not registered as a Supabase Auth Send-Email Hook**. `supabase/config.toml` only declares it as a regular function (`[functions.send-auth-email] verify_jwt = false`) — there is no `[auth.hook.send_email]` block.

Result: Supabase Auth falls back to its built-in default email service, which on the hosted plan is heavily rate-limited (a handful of emails per hour) and frequently silently drops messages — especially for new sender reputation against business mail servers like Microsoft 365 (which both `trewirgietimber.co.za` and `laurensmith.co.za` likely use). Resend is never invoked, so nothing shows in `email_events`, nothing shows in our edge logs, and DKIM/SPF on `crunchcarbon.com` doesn't help because the mail isn't going through our verified domain at all.

This also explains why the proposal invitation emails (which DO go through `send-cession-agreement-email`/proposal automation → Resend) reach the clients fine, but the auth verification email does not.

## Fix

### 1. Register `send-auth-email` as the Supabase Auth send-email hook

Add to `supabase/config.toml`:

```toml
[auth.hook.send_email]
enabled = true
uri = "https://<project-ref>.supabase.co/functions/v1/send-auth-email"
secrets = "env(SEND_EMAIL_HOOK_SECRET)"
```

Confirm `SEND_EMAIL_HOOK_SECRET` is set in Edge Function secrets (the function already calls `new Webhook(hookSecret).verify(...)`, so the secret must match what's configured in the Auth dashboard hook settings). If it isn't set, add it.

### 2. Verify the function works end-to-end

- Redeploy `send-auth-email`.
- Trigger one signup via the proposal flow (or use `supabase.auth.admin.generateLink` against a throwaway address).
- Confirm a row appears in `email_events` with subject "Verify your email" / "Welcome to the Crunch Carbon team!" and `event_type = email.delivered`.
- Confirm the edge function logs show a 200 from the hook invocation.

### 3. Resend the verification to Conrad and Lauren

Once the hook is live, call `supabase.auth.admin.generateLink({ type: 'signup', email })` (or use the existing "Resend verification email" button on the success dialog — it'll now route through Resend) for both clients so they get a fresh, deliverable link.

### 4. Tell the clients to check spam once

First-time auth mail from a freshly-warmed sender often lands in Junk on M365/Google Workspace tenants. Ask them to whitelist `proposals@crunchcarbon.com` (or whichever `from` address `send-auth-email` uses — verify it matches a verified Resend domain) the first time.

## Out of scope

- No template changes. The existing branded HTML in `send-auth-email/index.ts` is fine.
- No change to the post-signup `RegistrationSuccessDialog` UI.
- No change to proposal/cession email pipelines — those already work.

## Verification checklist

- [ ] `[auth.hook.send_email]` block present and pointing at the deployed function URL
- [ ] `SEND_EMAIL_HOOK_SECRET` exists and matches the hook config
- [ ] Test signup produces a row in `email_events` (status `email.delivered`) within ~10s
- [ ] Edge logs for `send-auth-email` show a 200 with the standardwebhooks signature verified
- [ ] Conrad and Lauren receive a fresh verification link and can confirm
