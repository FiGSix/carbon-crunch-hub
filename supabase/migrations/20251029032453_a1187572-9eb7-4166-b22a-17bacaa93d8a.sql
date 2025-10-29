-- Fix critical RLS policy bug preventing stakeholders from inserting/updating data_access_config
-- Problem: Previous policy incorrectly referenced data_access_config.project_id in WITH CHECK
-- Solution: Directly reference the project_id column from the new row

DROP POLICY IF EXISTS "Stakeholders can configure data access" ON data_access_config;

CREATE POLICY "Stakeholders can configure data access"
ON data_access_config
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE po.id = project_id
    AND (
      p.client_id = auth.uid() 
      OR p.agent_id = auth.uid()
      OR p.client_reference_id IN (
        SELECT id FROM clients WHERE user_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "Stakeholders can update data access" ON data_access_config;

CREATE POLICY "Stakeholders can update data access"
ON data_access_config
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE po.id = project_id
    AND (
      p.client_id = auth.uid() 
      OR p.agent_id = auth.uid()
      OR p.client_reference_id IN (
        SELECT id FROM clients WHERE user_id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE po.id = project_id
    AND (
      p.client_id = auth.uid() 
      OR p.agent_id = auth.uid()
      OR p.client_reference_id IN (
        SELECT id FROM clients WHERE user_id = auth.uid()
      )
    )
  )
);