-- Fix RLS policies on data_access_config to support UPSERT operations
-- Drop the existing policy that causes issues with UPSERT
DROP POLICY IF EXISTS "Stakeholders can manage data access" ON public.data_access_config;

-- Create separate INSERT policy using WITH CHECK (validates incoming data)
CREATE POLICY "Stakeholders can insert data access config"
ON public.data_access_config
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

-- Create separate UPDATE policy using USING (validates existing rows)
CREATE POLICY "Stakeholders can update data access config"
ON public.data_access_config
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

-- Create separate DELETE policy
CREATE POLICY "Stakeholders can delete data access config"
ON public.data_access_config
FOR DELETE
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
);

-- Optional: Add CHECK constraint to limit credential_method values
ALTER TABLE public.data_access_config
DROP CONSTRAINT IF EXISTS data_access_config_credential_method_check;

ALTER TABLE public.data_access_config
ADD CONSTRAINT data_access_config_credential_method_check
CHECK (credential_method IN ('delegated_account', 'api_key'));

-- Optional: Drop readonly_username column as it's no longer used
ALTER TABLE public.data_access_config
DROP COLUMN IF EXISTS readonly_username;