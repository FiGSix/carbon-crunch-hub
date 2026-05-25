## Goal

Make the `client_email_suppressions` block list also stop proposals created from the public "For Homes" and "For Business" eligibility modal, matching the protection that already exists on the in-app invite and portfolio outreach paths.

## Scope

In scope:
- `send-eligibility-proposal` edge function — block before creating proposal / sending email
- `send-contact-email` edge function — block before sending contact email (silent)
- Frontend toast in `EligibilityModal` so the visitor sees a clean message instead of a generic error

Out of scope:
- Auto-blocking, domain blocks, IP blocks, notifying the blocked email (unchanged from the v1 rules we already agreed on)
- `CreateProposal` / `SubmitProject` (require login; blocked emails can't reach them)

## How it works

1. **Edge function suppression check (shared helper).** Add a small helper inside each edge function (or a shared `_shared/suppression.ts`) that calls the existing `is_client_email_suppressed(p_email)` RPC using the service-role client already initialized in each function. Returns boolean.

2. **`send-eligibility-proposal/index.ts`** — right after input validation and email normalization, before the `clients` upsert:
   - If suppressed → return `200` with `{ blocked: true }` (silent block; do NOT reveal block reason to the visitor). No proposal insert, no Resend call, no client row created.
   - Log it server-side: `console.log("Blocked eligibility submission from suppressed email", email)` so admins can see it in function logs.

3. **`send-contact-email/index.ts`** — same pattern at the top of the handler. Silent success response, no email sent.

4. **`EligibilityModal.tsx`** — when the response is `{ blocked: true }`, show the same generic success toast we show today ("Thanks, we'll be in touch"). Silent block = visitor sees no difference, so they don't just retry with a tweaked email.
   - Internally we still want admins to know: the edge-function log line above is enough for now (no new notification surface).

5. **No DB migration needed.** The `is_client_email_suppressed` RPC and `client_email_suppressions` table are already in place from the earlier migration.

## Technical notes

- Suppression check is case-insensitive via the RPC's `lower(email)` comparison — matches what the admin UI uses.
- The edge function uses the service-role client, so RLS doesn't block the RPC call; the RPC is `SECURITY DEFINER` anyway.
- Keep the silent-block pattern consistent with the in-app surfaces (we never tell the recipient they're blocked).
- Two edge functions touched; both auto-deploy.

## Files to change

- `supabase/functions/send-eligibility-proposal/index.ts` — add suppression check
- `supabase/functions/send-contact-email/index.ts` — add suppression check
- `src/pages/solar-rewards/EligibilityModal.tsx` — handle `{ blocked: true }` with the normal success toast
- (Optional) `supabase/functions/_shared/suppression.ts` — shared helper if both functions can import it cleanly
