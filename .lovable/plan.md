# Fix referral attribution for AREP (and all partner links)

Two migrations plus a small client tweak. `test@test.com` has already been deleted from auth + profiles, so the backfill step (c) is now a no-op and removed.

## 1. Fix `apply_referral_on_signup` RPC

Change one line so `referred_by_agent_id` is set for **both** `client` and `agent` link types (currently only set when `link_type='client'`, which is why agent-recruitment signups never got attributed to the super partner).

```sql
referred_by_agent_id = v_link.owner_id   -- always, regardless of link_type
```

Everything else in the RPC stays as-is (still creates the pending `super_partner_link_requests` row for agent links, still increments `signups`, still writes a `referral_events` row).

## 2. Move attribution into `handle_new_user` (server-side, reliable)

Extend the existing `handle_new_user` trigger so that when the new auth user's `raw_user_meta_data` contains a `ref_token`, it calls `apply_referral_on_signup(ref_token, NEW.id)` at the end of the function (inside a `BEGIN…EXCEPTION WHEN OTHERS THEN` block so a bad token can never break signup).

This removes the dependency on the client-side RPC call in `useRegisterForm.ts`, which is fire-and-forget and has been silently failing.

## 3. Pass `ref_token` in signup metadata (client)

**`src/hooks/useRegisterForm.ts`** — when calling `supabase.auth.signUp`, read the referral token from `localStorage.crunchcarbon_ref` (already persisted by `Register.tsx` and `PartnerReferralLandingPage.tsx`) and include it in `options.data.ref_token`. Keep the existing post-signup RPC call as a belt-and-braces fallback, but log its return value/error explicitly instead of swallowing it.

No change needed to `PartnerReferralLandingPage.tsx` — it already writes the token to localStorage before redirecting to `/register`.

## Out of scope

- Backfilling test@test.com (user deleted).
- Super-partner approval UI, `super_partner_status` logic, email/auth-hook changes, client-type link flows.

## Files touched

- New migration under `supabase/migrations/` (RPC + trigger)
- `src/hooks/useRegisterForm.ts`

## Verification after deploy

1. Open AREP's agent link `/ref/3e72eefe73d2d0ce5f237bfd` in a fresh browser.
2. Register a new agent.
3. Confirm in DB: new profile has `referred_by_link_id` and `referred_by_agent_id` set to AREP's link/user, `referral_links.signups` incremented, `referral_events` has a `signup` row, and `super_partner_link_requests` has a pending row for AREP.
