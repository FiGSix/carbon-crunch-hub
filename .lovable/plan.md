
# Fix: Shaida Cannot Save Onboarding Fields — Stale RLS Policy

## Root Cause — Plain English

There are two different "door locks" in the database for who can write to onboarding fields:

1. **The shared function** (`is_project_stakeholder`) — this was updated to recognise Shaida as a company co-admin for Texiwell Investments. It correctly returns `true` for her.
2. **The `onboarding_fields` table's own write policy** — this uses an old, hard-coded copy of the access check that was never updated. It is missing the company membership check entirely. This is what Shaida hits when she tries to save.

Because the table policy is stale, the database rejects her write with `"new row violates row-level security policy for table onboarding_fields"`. The error has been firing at `08:13` and `08:17` UTC this morning.

---

## Evidence

| Detail | Value |
|---|---|
| Shaida's user ID | `d32a7219-...` |
| Shaida's role | `client` |
| Her company | Texiwell Investments (company ID `853ef604`) |
| Her membership | `account_admin`, `active` in Texiwell |
| Project client | Dr Mohammed Essa (company ID `853ef604`) — same company |
| `is_project_stakeholder()` check 6 result | **PASSES** ✓ |
| `onboarding_fields` RLS policy check | **FAILS** — missing check 6 |
| DB error logged | `new row violates row-level security policy for table "onboarding_fields"` at 08:13 and 08:17 UTC |

The `onboarding_fields` RLS policy uses an inline 5-check query. The `is_project_stakeholder()` function has 6 checks. The 6th check (client company membership) is what Shaida qualifies under. The policy never got the 6th check added.

---

## The Fix — One Database Migration

Replace the two stale inline RLS policies on `onboarding_fields` with the canonical `is_project_stakeholder()` function call — the same pattern used correctly on `data_access_config`, `onboarding_documents`, `onboarding_comments`, and `onboarding_activity_log`.

### SQL to Execute

```sql
-- Drop the stale policies on onboarding_fields
DROP POLICY IF EXISTS "Stakeholders can update fields" ON public.onboarding_fields;
DROP POLICY IF EXISTS "Users can view project fields" ON public.onboarding_fields;

-- Recreate with canonical is_project_stakeholder() function
CREATE POLICY "Stakeholders can manage onboarding fields"
  ON public.onboarding_fields
  FOR ALL
  USING (public.is_project_stakeholder(project_id))
  WITH CHECK (public.is_project_stakeholder(project_id));

CREATE POLICY "Stakeholders can view onboarding fields"
  ON public.onboarding_fields
  FOR SELECT
  USING (public.is_project_stakeholder(project_id));
```

### Why `WITH CHECK` is Added

The existing ALL policy had no explicit `WITH CHECK`. When omitted on an ALL policy, PostgreSQL uses the USING expression — but this only applies to the WHERE filter on existing rows. Adding an explicit `WITH CHECK` with the same function makes INSERT behaviour unambiguous and correct.

---

## Why This Is Safe

- `is_project_stakeholder()` is a `SECURITY DEFINER` function — it runs with elevated privileges, so it can correctly evaluate all 6 checks even for restricted users like Shaida.
- This is exactly the same pattern already working on `onboarding_documents`, `data_access_config`, `onboarding_comments`, and `onboarding_activity_log`.
- Replacing the inline check with the function call does not change who has access — it only adds the missing check 6 (company co-admin) that the function already has but the inline query was missing.
- No frontend code changes. No edge functions. No other tables.

---

## Scope

| Layer | Change |
|---|---|
| Database RLS | Drop 2 stale policies, create 2 updated policies on `onboarding_fields` |
| Frontend code | None |
| Edge functions | None |
| Other tables | None |

One migration. Shaida can save immediately after deployment.
