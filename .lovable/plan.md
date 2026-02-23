

# Fix: Allow Client Company Members to Upload & Collaborate on Onboarding

## Findings

After a thorough audit, the file upload failure is just the tip of the iceberg. There are **8 policies** across 4 tables (plus 2 storage policies) that are missing the `client_company_members` check. This means Shaida and other client company team members are blocked from:

- Uploading documents (the reported issue)
- Viewing uploaded documents
- Viewing or posting comments
- Viewing activity log entries
- Viewing assigned tasks

All of these are required for collaborative work toward "Audit Ready" status.

## Root Cause

When the `is_project_stakeholder()` function was updated (migration `20260219`) to include client company members, only the tables that **use that function** benefited (`onboarding_fields`, `data_access_config`). The remaining tables still use **inline SQL** that only checks for agents, agent team members (`company_members`), direct clients, and admins.

## What the Migration Must Fix

### Group A: Directly blocking file upload (the reported bug)

| # | Table | Policy | Command |
|---|---|---|---|
| 1 | `storage.objects` | "Onboarding document uploads for stakeholders" | INSERT |
| 2 | `storage.objects` | "Users can delete own project documents" | DELETE |
| 3 | `onboarding_documents` | "Stakeholders can insert documents" | INSERT |

### Group B: Blocking visibility and collaboration (needed for audit-ready)

| # | Table | Policy | Command |
|---|---|---|---|
| 4 | `onboarding_documents` | "Stakeholders can manage documents" | ALL |
| 5 | `onboarding_documents` | "Users can view documents" | SELECT |
| 6 | `onboarding_comments` | "Users can view comments" | SELECT |
| 7 | `onboarding_activity_log` | "Users can view activity log" | SELECT |
| 8 | `onboarding_tasks` | "Users can view tasks" | SELECT |

### Already correct (no changes needed)

- `onboarding_fields` -- uses `is_project_stakeholder()` (already includes client company members)
- `data_access_config` -- INSERT/UPDATE/DELETE/SELECT use `is_project_stakeholder()` (already correct)

## The Fix: Add Client Company Member Check

Each of the 8 policies above needs one additional `OR EXISTS` clause appended:

```sql
OR EXISTS (
  SELECT 1
  FROM clients c
  JOIN client_company_members ccm
    ON ccm.client_company_id = c.client_company_id
  WHERE c.id = p.client_reference_id
    AND ccm.user_id = auth.uid()
    AND ccm.status = 'active'
)
```

This mirrors check #6 in `is_project_stakeholder()`.

## Scope Guard: What This Migration Does NOT Touch

- No frontend code changes
- No edge function changes
- No changes to `is_project_stakeholder()` (already correct)
- No changes to `onboarding_fields` or `data_access_config` policies (already correct)
- No table schema changes
- No trigger or function changes
- No changes to any table outside the 4 listed above + storage

## Implementation

**Single migration file** that:
1. Drops and recreates all 8 policies with the added client company member check
2. Reproduces existing logic verbatim (surgical approach per project guidelines)
3. Only appends the missing `OR EXISTS` clause to each policy

## Ideal Long-Term Refactor (Not in This Migration)

The `onboarding_documents`, `onboarding_comments`, `onboarding_activity_log`, and `onboarding_tasks` tables should eventually be migrated to use `is_project_stakeholder()` like `onboarding_fields` does, so future permission changes propagate automatically. However, this is a larger refactor and should be done separately to avoid risk. The storage policies cannot use `is_project_stakeholder()` directly due to how storage RLS works (the `project_id` must be extracted from the file path).

