-- Fix: Allow clients to update onboarding when client_reference_id = their user ID
-- This handles cases where client_reference_id directly holds the user's profile.id
DROP POLICY IF EXISTS "Stakeholders can update onboarding" ON project_onboarding;

CREATE POLICY "Stakeholders can update onboarding"
ON project_onboarding
FOR UPDATE
TO authenticated
USING (
  is_current_user_admin()
  OR EXISTS (
    SELECT 1
    FROM proposals p
    WHERE p.id = project_onboarding.proposal_id
      AND (
        p.agent_id = auth.uid()
        OR p.client_id = auth.uid()
        OR p.client_reference_id = auth.uid()
        OR p.client_reference_id IN (
          SELECT id FROM clients WHERE user_id = auth.uid()
        )
      )
  )
);