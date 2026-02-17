

## Fix: Project Onboarding RLS Policy Missing Company Visibility

### Problem
The frontend code for the onboarding list was fixed to include company membership, but the **RLS policy** on the `project_onboarding` table blocks company members from seeing the data. The policy "Clients can view own onboarding" only checks direct user match -- not `client_company_members`.

### Current RLS (broken for company members)
```text
p.client_id = auth.uid()
OR p.client_reference_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
```

### Fix
Update the RLS SELECT policy to also check company membership:

```text
p.client_id = auth.uid()
OR p.client_reference_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
OR p.client_reference_id IN (
    SELECT c.id FROM clients c
    WHERE c.client_company_id IN (
        SELECT ccm.client_company_id 
        FROM client_company_members ccm
        WHERE ccm.user_id = auth.uid() AND ccm.status = 'active'
    )
)
```

### Technical Details

**Database migration** -- Drop and recreate the "Clients can view own onboarding" policy on `project_onboarding`:

```sql
DROP POLICY IF EXISTS "Clients can view own onboarding" ON project_onboarding;

CREATE POLICY "Clients can view own onboarding"
ON project_onboarding
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = project_onboarding.proposal_id
    AND (
      p.client_id = auth.uid()
      OR p.client_reference_id IN (
        SELECT id FROM clients WHERE user_id = auth.uid()
      )
      OR p.client_reference_id IN (
        SELECT c.id FROM clients c
        WHERE c.client_company_id IN (
          SELECT ccm.client_company_id
          FROM client_company_members ccm
          WHERE ccm.user_id = auth.uid()
            AND ccm.status = 'active'
        )
      )
    )
  )
);
```

Also review and apply the same fix to the "Stakeholders can update onboarding" UPDATE policy if it lacks client company visibility (it currently only checks agent company membership via `company_members`, not client company membership).

### No frontend changes needed
The frontend query in `ProjectOnboardingList.tsx` was already updated in the previous fix to include company client IDs.

### Impact
After this migration, Kobie and Shaida will be able to see all 10 Texiwell onboarding projects on the `/onboarding` page.

