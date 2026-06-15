# Fix: SP "Create Proposal" hidden + collapse duplicate profile loaders

## Root cause

DB confirms `shaun@nuvoconsulting.com` has `role='super_partner'`, `can_create_proposals=true`. The sidebar gate `p?.can_create_proposals === true` is correct. But the live `AuthProvider` (`src/contexts/auth/AuthContext.tsx`) loads the profile via an **inline function** (lines 60–123) whose explicit `select(...)` and `UserProfile` mapping both omit `can_create_proposals`. The earlier addendum updated the *unused* `useProfileLoader.ts` instead. Result: `profile.can_create_proposals` is always `undefined` on the client and the sidebar item is hidden for every SP.

Confirmed by `rg`: `useProfileLoader`, `useOptimizedAuth`, and `useAuthInitializer` are each defined but have zero importers anywhere in `src/`. They are dead code.

## Changes

### 1. Fix the live loader (`src/contexts/auth/AuthContext.tsx`)

- Add `can_create_proposals` to the explicit `select(...)` column list (next to `super_partner_id`, `super_partner_status`).
- Add `can_create_proposals: (data as any).can_create_proposals ?? false` to the `UserProfile` object that is set into state and cached.

### 2. Delete orphaned profile-loading code paths

Confirmed unused by AuthProvider and by anything else in `src/`:

- `src/hooks/auth/useProfileLoader.ts` — delete.
- `src/hooks/auth/useOptimizedAuth.ts` — delete (builds `UserProfile` with an even shorter column set; no consumers, so no delegation wrapper needed).
- `src/hooks/auth/useAuthInitializer.ts` — delete (only existed to wire `useProfileLoader` into a never-mounted initializer).

After deletion, grep for stale references and remove any orphan imports surfaced. Do not touch `useAuthState`, `useAuthStateSync`, `useAuthReliability`, `useOptimizedAuthReliability`, or `src/hooks/auth/authCache.ts` in this PR — they are also orphaned but outside the "profile-loading" scope the user asked about; flag them in the closing message as a follow-up cleanup candidate.

### 3. No type / consumer changes

`UserProfile` already includes `can_create_proposals?: boolean | null`. Sidebar gate, route guards, page early-returns, and admin toggle are already correct from the prior PR. No consumer is reading from the deleted hooks, so no call sites need updating.

## Verification

1. Hard-reload as `shaun@nuvoconsulting.com` → "Create Proposal" and "My Clients" appear in the sidebar; route loads (no AccessNotEnabled).
2. Suspended SP `shaun.slabber.africa@gmail.com` (flag `false`) → sidebar items hidden; visiting `/create-proposal` directly shows AccessNotEnabled (not blank, not 403).
3. Admin toggles `can_create_proposals` off on the SP detail drawer → after the next reload (5s cache or sign out/in) the items disappear.
4. `rg "useProfileLoader|useOptimizedAuth|useAuthInitializer" src/` returns no matches.
5. Typecheck/build passes.

## Outcome

One profile-loading code path (`AuthContext.tsx`), one column list. Next column added to `profiles` only needs to be wired in that single place.
