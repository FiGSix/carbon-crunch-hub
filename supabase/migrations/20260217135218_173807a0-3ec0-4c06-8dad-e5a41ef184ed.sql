
-- Fix: Add client company membership visibility to project_onboarding SELECT policy
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
