# Recaro / Greg Walton — why he can't sign

## What I checked in the live database

**Greg's account (greg@killickwalton.co.za)**
- Auth user exists, email confirmed 20 Jul 2026, not banned, not deleted.
- **He signed in successfully today at 07:44 SAST.** Authentication itself is not broken.
- Profile role: `client`. Role row in `user_roles`: `client`. Active member of the Supersolar client company.

**The Recaro proposal**
- Status `delivered`, invitation sent 14 Aug, **viewed 14 Aug**, token valid until 24 Aug.
- Correctly linked to his client record via `client_reference_id`, and that client record is linked to his user ID, so the access rules do let him open and see it.
- No signed agreement exists yet.

So: he can log in, and he can reach the agreement. The blocker is at the signature step.

## Root cause — his client record has corrupted name fields

His row in `clients` is:

```text
first_name = "358.8"
last_name  = "kWp"
company    = "Supersolar"
email      = greg@killickwalton.co.za
```

The system size (358.8 kWp) was written into the name fields.

The signing page pulls the **live** client record (it deliberately prefers live data over the proposal snapshot) and uses that as the client name. The "Type Name" signature box then validates that what he types matches the client name — so the only string that would let him sign is literally "358.8 kWp". Everything he types shows "Name doesn't match the client name (358.8 kWp)". That is the wall he's hitting.

This is a one-off: only 1 of 574 client records has this corruption.

## The fix

1. **Correct the data.** Set his client record to `first_name = "Greg"`, `last_name = "Walton"` (company stays "Supersolar", email and phone unchanged). Once corrected, the signature name check accepts "Greg Walton" and he can sign — no new invitation needed, his link is valid until 24 Aug.

2. **Stop the name box being a dead end.** In the signature section, when the typed name doesn't match, also accept the client's company name and the proposal-snapshot contact name, and change the hard block into a clear message. Drawing a signature is already accepted, so no one should ever be locked out solely because a stale name string doesn't match.

3. **Guard the source of the corruption.** Add validation where client records are created/updated from proposal data so numeric or unit-like values ("358.8", "kWp") can never be written into `first_name` / `last_name`; fall back to the contact name on the proposal instead.

## About "can't log in"

Nothing in his auth record blocks login, and he authenticated successfully this morning. If he still reports a login problem, it is the same post-login symptom you saw yesterday — the app signs you in but the profile fetch fails silently, leaving an empty sidebar and blank cards. That resilience fix (retry, no caching of failures, visible retry action) is still outstanding and I'd recommend doing it alongside this.

## Technical notes

- Data correction: single `UPDATE` on `public.clients` for id `f9d3e5d1-63e6-4410-a408-1a4083db7d92`.
- Code: `src/pages/ProposalAcceptance/components/SignatureSection.tsx` (name-match acceptance), `src/utils/proposals/resolveClientInfo.ts` (ignore junk live names and fall back to the snapshot), and the client create/update path in `src/services/unified/clients` (input guard).
- No schema or RLS changes — access rules already permit him.
