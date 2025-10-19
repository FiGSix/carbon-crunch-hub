-- Tighten RLS policies on data_access_config to prevent credential exposure
-- Drop the existing "Admins can manage all data access" policy to recreate more specific ones
DROP POLICY IF EXISTS "Admins can manage all data access" ON data_access_config;

-- Create explicit SELECT policy - ADMINS ONLY
CREATE POLICY "Only admins can view credentials"
ON data_access_config
FOR SELECT
USING (is_current_user_admin());

-- Recreate admin management policies (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can insert data access config"
ON data_access_config
FOR INSERT
WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update data access config"
ON data_access_config
FOR UPDATE
USING (is_current_user_admin());

CREATE POLICY "Admins can delete data access config"
ON data_access_config
FOR DELETE
USING (is_current_user_admin());

-- Keep stakeholder INSERT policy (they can create configs for their projects)
-- Policy "Stakeholders can configure data access" already exists

-- Update stakeholder UPDATE policy to ensure no implicit SELECT access
-- By having a separate admin-only SELECT policy, stakeholders cannot SELECT even if UPDATE allows them to update
DROP POLICY IF EXISTS "Stakeholders can update data access" ON data_access_config;

CREATE POLICY "Stakeholders can update data access"
ON data_access_config
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE po.id = data_access_config.project_id
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
    WHERE po.id = data_access_config.project_id
    AND (
      p.client_id = auth.uid()
      OR p.agent_id = auth.uid()
      OR p.client_reference_id IN (
        SELECT id FROM clients WHERE user_id = auth.uid()
      )
    )
  )
);

-- Add comment explaining the security model
COMMENT ON TABLE data_access_config IS 'Contains sensitive third-party API credentials. SELECT restricted to admins only. Non-admin stakeholders must use get_data_access_status() RPC function which filters sensitive fields.';