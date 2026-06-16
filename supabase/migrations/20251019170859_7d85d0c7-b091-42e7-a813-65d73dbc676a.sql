-- Fix data_access_config credential exposure
-- Split access: admins see all, stakeholders see only status/config (not credentials)

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Stakeholders can manage data access" ON public.data_access_config;
DROP POLICY IF EXISTS "Users can view data access config" ON public.data_access_config;

-- Admins get full access
CREATE POLICY "Admins can manage all data access"
ON public.data_access_config
FOR ALL
TO authenticated
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

-- Stakeholders can INSERT/UPDATE (to configure), but SELECT is restricted
CREATE POLICY "Stakeholders can configure data access"
ON public.data_access_config
FOR INSERT
TO authenticated
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

CREATE POLICY "Stakeholders can update data access"
ON public.data_access_config
FOR UPDATE
TO authenticated
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
);

-- Create a safe function for stakeholders to view non-sensitive config
CREATE OR REPLACE FUNCTION public.get_data_access_status(project_id_param uuid)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  provider text,
  credential_method text,
  portal_url text,
  site_id text,
  last_test_status text,
  last_test_error text,
  last_test_at timestamp with time zone,
  first_data_ingested_at timestamp with time zone,
  configured_by uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  has_credentials boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the user is a stakeholder of this project
  IF NOT EXISTS (
    SELECT 1
    FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE po.id = project_id_param
    AND (
      p.client_id = auth.uid()
      OR p.agent_id = auth.uid()
      OR p.client_reference_id IN (
        SELECT c.id FROM clients c WHERE c.user_id = auth.uid()
      )
      OR is_current_user_admin()
    )
  ) THEN
    RAISE EXCEPTION 'Access denied to project data access configuration';
  END IF;

  -- Return non-sensitive fields only
  RETURN QUERY
  SELECT 
    dac.id,
    dac.project_id,
    dac.provider,
    dac.credential_method,
    dac.portal_url,
    dac.site_id,
    dac.last_test_status,
    dac.last_test_error,
    dac.last_test_at,
    dac.first_data_ingested_at,
    dac.configured_by,
    dac.created_at,
    dac.updated_at,
    -- Indicate if credentials exist without exposing them
    (dac.api_key_encrypted IS NOT NULL 
     OR dac.readonly_username IS NOT NULL 
     OR dac.delegated_email IS NOT NULL) as has_credentials
  FROM data_access_config dac
  WHERE dac.project_id = project_id_param;
END;
$$;