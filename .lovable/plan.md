## What we know

Both users have a confirmation email sent but never confirmed:

| User | Created | Last confirmation sent | Confirmed? |
|---|---|---|---|
| `lauren@laurensmith.co.za` | 2026-05-08 11:30 | 2026-05-08 11:38 | No |
| `conrad@trewirgietimber.co.za` | 2026-03-27 | 2026-05-11 11:49 | No |

The `send-auth-email` hook is firing correctly (verified by a live test signup yesterday — Resend accepted, email delivered, hook returned 200). So the email IS being sent. The link is then never successfully consumed.

Auth logs only retain a few hours, so I cannot directly prove a scanner pre-fetched their specific tokens. But the symptom — corporate domains, link clicked but user lands on "expired/invalid" — is the classic fingerprint of:

- **Microsoft 365 Safe Links / Defender for Office 365**
- **Mimecast URL Defense**
- **Proofpoint URL Defense / Barracuda LinkProtect**

These scanners issue a `GET` against the verification URL **before** the user ever clicks. Supabase's `/auth/v1/verify` endpoint is **single-use** — the first GET consumes the token, marks the user confirmed in the scanner's IP, and any subsequent click by the human returns "Email link is invalid or has expired."

A secondary failure mode also exists: clients click "Resend verification email" (your `VerifyEmail.tsx` page exposes this), which **invalidates the prior token immediately** — if the original was already in flight or sitting in spam, both links now fail.

## Goal

Make verification reliable for users behind corporate mail security, without breaking the experience for normal mailboxes.

## The fix: hybrid OTP + link verification

Switch the auth email from "click a single-use link" to "click a link **OR** type a 6-digit code". The OTP path is immune to link pre-fetching because scanners cannot type a code into a form.

This is the same pattern Vercel, GitHub, Linear, Notion and Supabase Dashboard itself use, and it's a one-line change on the Supabase side because every email confirmation already has a 6-digit token attached to the same `token_hash`.

### Changes

**1. Update `supabase/functions/send-auth-email/index.ts`**
- The webhook payload already includes `email_data.token` (the 6-digit OTP) alongside `token_hash`. We are currently discarding it.
- Show the OTP prominently in the email body (large, monospace, copy-friendly) **above** the "Verify Email Address" button.
- Keep the link as a secondary option for users on normal mail.
- Add anti-prefetch hardening to the email HTML: the link itself stays, but framed with text like "If you're using a corporate email and the button doesn't work, paste this 6-digit code on the verify page instead."

**2. Update `src/pages/VerifyEmail.tsx`**
- Add an OTP input (6-digit) above the existing "Resend" button.
- On submit: call `supabase.auth.verifyOtp({ email, token, type: 'signup' })`.
- On success: redirect to `/auth/callback` (or straight to onboarding) with the established session.
- Keep "Resend" but add a 60-second cooldown to stop users invalidating fresh tokens by hammering it.

**3. Increase OTP expiry from 24h → 72h**
- In Supabase Dashboard → Auth → Email → set `Mailer OTP expiry` to `259200` (72h).
- Update the wording on `VerifyEmail.tsx` and in the email template from "24 hours" to "72 hours".
- Rationale: corporate mail can sit in quarantine for 24–48h before an admin releases it; current window is too tight.

**4. Manually re-issue verification for Lauren and Conrad**
- Use the admin `generate_link` flow to mint a fresh OTP for each, send via the existing hook, and email them the 6-digit code directly so they can self-verify on the new page. Do this **after** the page changes ship so the OTP they receive actually has somewhere to be entered.

### Out of scope (deferred)

- Disabling email verification entirely — not recommended; it's the only spam guard on signup.
- Adding magic-link login as a parallel path — bigger change, can be a follow-up.
- DMARC/SPF tuning on `crunchcarbon.com` — already passing per Resend, not the cause here.

## Technical notes

- `verifyOtp({ type: 'signup' })` returns a `Session` directly, so the user is logged in immediately on success — no second redirect dance needed.
- The 6-digit token in `email_data.token` is the same secret as `token_hash` in a different encoding; using it does not weaken security.
- No database migration required.
- No new secrets required.

## Files to touch

```text
supabase/functions/send-auth-email/index.ts   # surface the OTP in email HTML
src/pages/VerifyEmail.tsx                     # add OTP input + verify call + cooldown
```

Plus one Supabase Dashboard change (OTP expiry → 72h) and a one-off re-invite for Lauren and Conrad after deploy.
