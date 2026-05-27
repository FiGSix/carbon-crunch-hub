
## Root cause

Two compounding bugs in `supabase/functions/poll-inbound/index.ts`:

1. **No "already processed" guard.** After the `inbound_messages` upsert (keyed on `graph_message_id`), the lead-ingest, MS Bookings, and classify branches all run again with no check on `processed_at` / `intent`. So every poll that re-sees the message will re-import leads, re-create meetings, and re-send Cora's summary reply to Shaun.

2. **Timestamp precision mismatch causes re-fetching.** We persist `last_inbound_poll_at` to whatever Graph returns and then strip fractional seconds when building the `$filter` (`...replace(/\.\d{3}Z$/, "Z")`). Graph stores `receivedDateTime` with millisecond precision (e.g. `14:06:54.123Z`), so the next call sends `gt 14:06:54Z` and the same message comes back. Confirmed in the DB: the "Leads:" message at `14:06:54` is the current `last_inbound_poll_at`, and the lead-ingest branch has no idempotency.

Net effect: Shaun's one `Leads:` email is re-ingested every 5 minutes and Cora emails him a fresh summary each time.

## Fix

Edit only `supabase/functions/poll-inbound/index.ts`:

1. **Idempotency guard.** Right after the `inbound_messages` upsert, if `inserted.processed_at` is non-null (or `inserted.intent` is already set), `continue` — skip booking parsing, lead ingest, and classify. New messages have `processed_at = null` so they flow through normally; re-seen messages are silently skipped.

2. **Bump the poll cursor past the latest message.** When computing the next `last_inbound_poll_at`, use `new Date(maxReceived).getTime() + 1` (ISO-formatted, no fractional seconds) instead of `maxReceived` itself. Combined with Graph's `gt` filter, this guarantees we never re-fetch the same message even when millisecond precision is dropped.

3. **Belt and braces:** keep stripping fractional seconds in the `$filter` (Graph requires it), but the +1 ms bump ensures the cursor still advances past the truncated boundary.

No DB migration, no UI change, no change to `_shared/lead-ingest.ts`. Existing already-processed rows (the `Leads:` one) will be left alone going forward because the guard fires on re-poll.

## Out of scope

- Re-architecting MS Bookings parsing (it has the same idempotency hole but isn't what the user is hitting).
- Backfilling `processed_at` on the legacy `Lead` / `Outreach list` rows — those have `intent = null` and are harmless; the guard will treat them as "not processed yet" but the subject regex won't match lead-ingest and they have no enrollment, so nothing happens.
