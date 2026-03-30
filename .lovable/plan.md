

# Fix: Client Company Team Members Can't Fully Access Onboarding Projects

## Problem

Mpho from Blume Energy (and other client team members) can **see** proposals and project onboarding list items, but cannot:
1. **Update** project onboarding records (e.g. mark steps complete)
2. **View/download** documents stored in the onboarding-documents storage bucket

This is because two RLS policies are missing the "client company member" check (check 6):

```text
✓ proposals SELECT         — has company member check
✓ project_onboarding SELECT — has company member check
✗ project_onboarding UPDATE — MISSING company member check
✓ onboarding_fields ALL     — uses is_project_stakeholder() which has it
✓ onboarding_documents ALL  — has inline company member check
✓ storage INSERT/DELETE      — has company member check
✗ storage SELECT (2 policies) — MISSING company member check
```

## Fix — 1 database migration

### 1. Update `project_onboarding` UPDATE policy

Add the client company member EXISTS clause (matching check 6 from `is_project_stakeholder`):

```sql
DROP POLICY "Stakeholders can update onboarding" ON project_onboarding;
CREATE POLICY "Stakeholders can update onboarding" ON project_onboarding
FOR UPDATE USING (
  is_current_user_admin()
  OR EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = project_onboarding.proposal_id
    AND (
      p.agent_id = auth.uid()
      OR p.client_id = auth.uid()
      OR p.client_reference_id = auth.uid()
      OR EXISTS (SELECT 1 FROM clients WHERE id = p.client_reference_id AND user_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM company_members cm1
        JOIN company_members cm2 ON cm1.company_id = cm2.company_id
        WHERE cm1.user_id = auth.uid() AND cm2.user_id = p.agent_id
        AND cm1.status = 'active' AND cm2.status = 'active'
      )
      OR EXISTS (  -- NEW: client company member check
        SELECT 1 FROM clients c
        JOIN client_company_members ccm ON ccm.client_company_id = c.client_company_id
        WHERE c.id = p.client_reference_id
        AND ccm.user_id = auth.uid() AND ccm.status = 'active'
      )
    )
  )
);
```

### 2. Update two storage SELECT policies

Both "Users can view own project documents" and "Authorized users can read onboarding documents" need the client company member EXISTS clause added to their WHERE conditions.

## Summary
- 1 migration with 3 policy updates (drop + recreate each)
- No code changes needed — the frontend queries and component logic are already correct
- This aligns these policies with the pattern already used in `is_project_stakeholder()`, storage INSERT/DELETE, and `onboarding_documents`

