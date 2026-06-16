## Background

You flagged a real risk, and verification confirms a bug in the just-built referral flow — but the underlying signing infrastructure already supports the "no account needed" promise, so this is **Option A (token-based)** and only the referral edge function needs fixing.

## What's already correct (no changes needed)

- Route `/proposals/:id/accept` in `App.tsx` is **not** behind `PrivateRoute`.
- `ProposalAcceptance` page already supports two modes:
  - `?token=...` → fetches via public RPC `get_proposal_by_token_direct` (no auth).
  - no token → falls back to authenticated RLS access.
- Edge function `accept-proposal` already accepts `{ token, typedName, signatureImage, ... }` and processes signing without a logged-in user. This is the same pattern used by `proposal-automation`, which emits links like `/proposals/:id?token=<invitation_token>`.

## The actual bug in `create-referral-proposal`

Two problems in `supabase/functions/create-referral-proposal/index.ts`:

1. **No `invitation_token` is generated** when inserting the referral proposal, so there is no token for the public signing flow to validate against.
2. The email link points to `/view-proposal/${proposal.id}` — that route does not exist in `App.tsx`, and it has no `?token=` query param. Clicking the email today would 404 (or bounce to auth).

## Fix

Edit `supabase/functions/create-referral-proposal/index.ts` only:

1. Before the `proposals` insert, generate:
   - `const invitationToken = crypto.randomUUID();`
   - `const invitationExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();` (30 days, matching existing convention).
2. Include `invitation_token: invitationToken` and `invitation_expires_at: invitationExpiresAt` in the insert payload.
3. Replace the email link with the correct, token-bearing acceptance URL:
   - `const signingLink = ${origin}/proposals/${proposal.id}/accept?token=${invitationToken};`
4. Keep the existing copy ("View & sign your proposal", "no account needed") — it will now be truthful.

## Out of scope (intentionally not touched)

- No changes to `ProposalAcceptance`, `accept-proposal`, `App.tsx`, RLS, RPCs, or any other proposal flow.
- No changes to the landing page, widget, or registration referral attribution.
- Token rotation / regeneration is already handled elsewhere (`generate-proposal-pdf`) and does not need duplication here.

## Verification after build

1. Submit the `/ref/:token` assessment as a fresh visitor (incognito).
2. Confirm the email link opens `/proposals/:id/accept?token=...` directly with no login prompt.
3. Sign with typed name; confirm `accept-proposal` succeeds and the post-sign onboarding modal appears.
4. Confirm the partner's dashboard counters increment (signup + conversion).
