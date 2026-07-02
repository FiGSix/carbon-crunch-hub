# Verify AREP Referral Attribution

Goal: confirm the migration + `useRegisterForm` changes actually attribute new signups from AREP's agent link (`/ref/3e72eefe73d2d0ce5f237bfd`) to AREP, and that AREP's dashboard counters (signups/conversions) reflect the new signup.

## Steps

### 1. Baseline snapshot (before test signup)
Query current state of AREP's referral link so we can diff after:
- `referral_links` row for token `3e72eefe73d2d0ce5f237bfd`: `clicks`, `signups`, `conversions`, `is_active`, `owner_id`.
- Count of `referral_events` rows for that `link_id`.
- Count of `super_partner_link_requests` for AREP (`super_partner_id = owner_id`).

### 2. Perform a live test signup through the link
Using Playwright against the preview:
1. Open `/ref/3e72eefe73d2d0ce5f237bfd` — confirm `localStorage.crunchcarbon_ref` is set and `referral_links.clicks` increments.
2. Navigate to the agent registration page and complete signup with a fresh disposable email (e.g. `arep-verify-<timestamp>@example.com`).
3. Capture console logs from `useRegisterForm` (the new `authLogger.info/warn` around `apply_referral_on_signup`) and any network errors.

### 3. Post-signup DB verification
For the new user, confirm in Postgres:
- `auth.users.raw_user_meta_data->>'ref_token'` equals AREP's token (proves metadata reached the trigger).
- `profiles` row: `referred_by_link_id` = AREP link id, `referred_by_agent_id` = AREP's `owner_id`, `referred_at` populated.
- `referral_links.signups` incremented by 1; `conversions` unchanged (conversion is a separate later event).
- `referral_events` has a new `signup` row for this user + link.
- `super_partner_link_requests` has a new pending row for AREP linked to the new agent.

### 4. Dashboard verification
- Log in as AREP (or as admin viewing AREP).
- Open the referral widget / `AdminReferralLinks` page and confirm the signups counter increased by 1 for AREP's link.
- Confirm the new agent appears in AREP's pending super-partner requests list (if that UI surface exists — otherwise verify via DB only and note the gap).

### 5. Cleanup
- Delete the test `auth.users` row (cascades to `profiles`, `referral_events`, `super_partner_link_requests`).
- Decrement `referral_links.signups` back if it doesn't auto-adjust, so counters stay accurate.

## Technical notes
- Trigger path (server-side) is now the source of truth; the client-side RPC in `useRegisterForm` is a logged fallback. Both should succeed — if only the fallback fires, that indicates `handle_new_user` isn't seeing `ref_token` in metadata.
- If email confirmation is required, the `profiles` row/trigger still runs at `auth.users` insert time, so attribution should not depend on the user confirming email.
- No code changes in this plan — verification only. If a check fails, we'll diagnose and propose a follow-up fix plan.

## Out of scope
- Backfilling historical signups (including the deleted `test@test.com`).
- Client-type referral links.
- Super-partner approval UX changes.
- Conversion-event wiring (only signup attribution is being verified; conversions increment on a separate downstream event).
