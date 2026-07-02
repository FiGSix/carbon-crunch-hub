# Harden Referral Attribution: Idempotent RPC + Remove Client Fallback

## Why

The server-side `handle_new_user` trigger now reliably attributes signups. The client-side fallback RPC in `useRegisterForm` runs a second time on success and double-increments `referral_links.signups`, inserts a duplicate `referral_events` row, and inserts a duplicate `super_partner_link_requests` row (that table has no unique key). This makes AREP's dashboard counters unreliable.

Best fix is defense in depth: make the RPC safe to call more than once, then remove the now-unnecessary client fallback.

## Changes

### 1. Make `apply_referral_on_signup` idempotent (migration)
Rewrite the function so calling it twice for the same `(link, user)` is a no-op:
- Guard the counter bump and the `referral_events` insert with `NOT EXISTS (SELECT 1 FROM referral_events WHERE referral_link_id = v_link.id AND user_id = p_new_user_id AND event_type = 'signup')`.
- Guard the `super_partner_link_requests` insert with `NOT EXISTS` on `(super_partner_id, company_id, request_type, status='pending')` so a repeat call doesn't create a second pending row.
- Keep the `profiles` update as-is (already idempotent — same values written).

### 2. Add a partial unique index on `super_partner_link_requests` (same migration)
`CREATE UNIQUE INDEX ... ON super_partner_link_requests (super_partner_id, company_id, request_type) WHERE status = 'pending';`
Belt-and-braces so any future insert path (admin UI, edge function, manual SQL) can't produce duplicate pending requests.

### 3. Remove the client-side fallback in `useRegisterForm.ts`
Delete the `apply_referral_on_signup` RPC call block (lines ~452–480). Keep the `localStorage.removeItem('crunchcarbon_ref')` cleanup and the `ref_token` metadata pass in the `signUp` call — that metadata is what the trigger reads.

## Verification

1. Fresh signup through `/ref/3e72eefe73d2d0ce5f237bfd`. Expect `referral_links.signups` = 1, one `referral_events` signup row, one pending `super_partner_link_requests` row, profile attributed.
2. Manually call `apply_referral_on_signup` a second time on the same user. Expect no counter change, no duplicate event, no duplicate request.
3. Clean up the test user.

## Out of scope

- Backfilling historical signups.
- Conversion-event wiring.
- Client-type referral link flows.
- Any other pre-existing linter warnings.

## Files touched

- New migration under `supabase/migrations/` (function rewrite + unique index).
- `src/hooks/useRegisterForm.ts` (delete fallback block).
