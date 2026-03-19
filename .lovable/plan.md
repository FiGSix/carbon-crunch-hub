

# Clean up: Remove client users from agent company_members table

## Problem
Lutendo Muti and Tumelo Manaleng are incorrectly listed in the **agent** `company_members` table for "New Planet Energy" (company ID: `3e2f76a8-dc8f-49d8-9aec-f613d5f01fd6`). They are client-role users and already correctly exist in `client_company_members`. This is the cross-contamination the `prevent_client_in_agent_teams` trigger should have prevented.

## Records to delete

| Name | company_members.id | email |
|------|-------------------|-------|
| Lutendo Muti | `1a11d8b6-8e65-46f9-a801-81748290b9b4` | lutendo@newplanet.co.za |
| Tumelo Manaleng | `98263a6b-e716-4879-a093-4b8b8221c1f2` | npehmonitoring@newplanet.co.za |

## Action

Run this SQL in the Supabase SQL Editor (RLS blocks client-side deletes on this table, so it must be run with admin/service role privileges):

```sql
DELETE FROM company_members 
WHERE id IN (
  '1a11d8b6-8e65-46f9-a801-81748290b9b4',
  '98263a6b-e716-4879-a093-4b8b8221c1f2'
);
```

No code changes needed — this is a data cleanup only.

