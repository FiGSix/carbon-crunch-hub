

# Root Cause: "Failed to update proposal status" for Keystone Client

## Problem
When the Keystone client (Lartsa Chicks / Keystone Hatchery) tries to sign the cession agreement, the `accept-proposal` edge function fails at the proposal status update step (line 341-347). The agreement record IS created successfully (there are 7 duplicate agreement records from repeated attempts), but the proposal remains stuck at "delivered" status.

## Root Cause
The `create_onboarding_on_signature` database trigger fires AFTER the proposal update sets `signed_at`. Inside the trigger, it attempts to cast proposal content fields to their target types:

```sql
commissioning_date_val := COALESCE((project_info->>'commissionDate')::DATE, NULL);
panel_total_kwp_val := COALESCE(NEW.system_size_kwp, (project_info->>'size')::NUMERIC, NULL);
```

For this proposal, both `commissionDate` and `size` are **empty strings** (`""`) rather than `null`. Postgres cannot cast an empty string to DATE or NUMERIC — it throws an exception, which rolls back the entire UPDATE transaction.

The `COALESCE` wrapper does NOT protect against this because the cast `''::DATE` throws before `COALESCE` evaluates.

## Evidence
- Proposal `47d928bc` has `content.projectInfo.commissionDate = ""` and `content.projectInfo.size = ""`
- 7 agreement records exist from repeated signing attempts (all succeeded because the INSERT happens before the proposal UPDATE)
- The error is reproducible via direct edge function call

## Fix (Two Parts)

### Part 1: Fix the trigger function (database migration)
Replace unsafe casts with `NULLIF` to convert empty strings to NULL before casting:

```sql
commissioning_date_val := COALESCE(
  (NULLIF(project_info->>'commissionDate', '')::DATE),
  NULL
);

panel_total_kwp_val := COALESCE(
  NEW.system_size_kwp,
  (NULLIF(project_info->>'size', '')::NUMERIC),
  NULL
);
```

Apply `NULLIF` to all string-to-type casts in the trigger: `commissionDate`, `size`, `gpsLat`, `gpsLng`.

### Part 2: Clean up duplicate agreement records
Delete the 7 orphaned agreement records that were created from failed signing attempts, keeping only the most recent one (or none, since the proposal was never actually approved).

### Part 3: Edge function hardening
Add a uniqueness guard in `accept-proposal` to check for existing agreements before inserting a new one, preventing duplicate records when the downstream update fails.

## Impact
This fix will immediately unblock the Keystone client (and any other client with empty-string project info fields) from signing proposals.

