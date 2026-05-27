## Two bugs, one symptom

You're seeing the right proposal on the admin dashboard's "Proposals worth a personal nudge" (hot/warm) widget, but two separate things are wrong:

### Bug 1 — The proposal really is missing from the Proposals page

The Proposals page fetches everything in a single `select(...)` against `proposals` with no explicit `.limit()` / `.range()`. Supabase silently caps that at **1000 rows** by default. Counted live:

- Active (non-deleted) proposals in the DB: **1206**
- Position of "Catholic Church of Queenstown" when ordered newest-first: **#1147**

So ~206 of the oldest active proposals are cut off before the client-side search box ever sees them — searching by title returns nothing because the row was never loaded. This affects every hot/warm proposal older than the 1000th newest, not just this one. The dashboard widget queries a different view (`proposal_engagement_buckets`) directly, so it still surfaces them, which is why the cards link to records the list can't find.

### Bug 2 — "Unknown client" label on the warm card

The proposal has `client_id = NULL` but `client_reference_id = 09b45048-…` → "Father Thulani". The warm-cards data source (`proposal_engagement_buckets` view + `useAgentWarmCards`) only looks up clients via `proposals.client_id`. When that's null, the card renders "Unknown client" even though there's a perfectly valid client on `client_reference_id`. This is the same dual-key inconsistency we hit earlier with the signing-name fix.

Removing the duplicate proposal earlier wouldn't have fixed either of these — they're general issues.

## Fix

**Part 1 — Proposals list (frontend only)**

In `src/hooks/proposals/utils/queryBuilders.ts`, append `.range(0, 4999)` to `buildBaseProposalsQuery`. That lifts the silent 1000 cap to 5000 (Postgres/PostgREST hard cap is higher than what we'll need for the foreseeable future). No server changes, no schema changes. Search will then find every active proposal, including this one. I'll add a TODO comment that proper pagination is the long-term answer once the list grows past a few thousand visible rows — but the current UI already client-side filters and renders, so a flat 5000 ceiling is safe today.

**Part 2 — Warm cards client name (view + hook)**

Update the `proposal_engagement_buckets` view to also expose `client_reference_id`, then update `useAgentWarmCards` to:
1. Select both `client_id` and `client_reference_id` from the view.
2. Build the client-lookup `IN` list from `client_reference_id ?? client_id` per row.
3. Resolve the card's name from whichever key matched.

That makes "Unknown client" become "Father Thulani" (and fixes the same label for any other proposal that lives on `client_reference_id`).

## What gets shipped

- `src/hooks/proposals/utils/queryBuilders.ts`: add `.range(0, 4999)` + TODO comment.
- DB migration: `CREATE OR REPLACE VIEW public.proposal_engagement_buckets` adding `client_reference_id` to the select.
- `src/hooks/dashboard/useAgentWarmCards.ts`: select the new column, prefer `client_reference_id` when present, fall back to `client_id`.

No RLS changes, no table changes. Approve and I'll implement.
