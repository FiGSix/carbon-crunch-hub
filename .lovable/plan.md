## Why proposals from the client referral link are failing

Edge function logs for `create-referral-proposal` show:

```
proposal insert failed { code: "PGRST204",
  message: "Could not find the 'client_email' column of 'proposals' in the schema cache" }
```

The function is inserting columns that don't exist on `public.proposals`. The table stores client info via `client_reference_id` (FK to `clients`), not denormalised on the proposal row. It also requires a `title` (NOT NULL) which the function never sets.

Confirmed against the live schema — `proposals` has no `client_email`, `client_name`, or `client_phone` columns, and `title` is `NOT NULL`.

## Fix (single file: `supabase/functions/create-referral-proposal/index.ts`)

1. **Rate-limit by client, not by `client_email` column.**
   First resolve the client via `find_or_create_client_by_email` (already called later in the function — move it up), then count recent proposals using `client_reference_id = <clientId>` over the last 24h. Keeps the existing 3/24h rule but uses real columns.

2. **Remove the non-existent fields from the insert.**
   Drop `client_name`, `client_email`, `client_phone` from the `.insert({...})` payload. Client identity already lives on the `clients` row referenced by `client_reference_id`, and the same info is already embedded in `content.client` for the proposal snapshot.

3. **Add the required `title`.**
   Set `title: \`Referral proposal – ${client.name}\`` (or `\`${client.name} – ${system.size_kwp} kWp\``) so the NOT NULL constraint is satisfied. No new column, no schema change.

4. **Also populate `client_id`** (mirror `client_reference_id`) for consistency with the rest of the platform, since both columns exist and other queries read `client_id`.

No database migration. No other files change. No UI change. The referral landing page keeps calling the same function with the same payload.

## Out of scope

- No changes to the carbon calculation (already aligned with platform via `calculateComplete`).
- No changes to the referral landing page UI.
- No schema changes to `proposals`.
- No changes to email-sending logic further down in the function.