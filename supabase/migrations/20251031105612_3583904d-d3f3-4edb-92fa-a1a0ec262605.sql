-- Add SELECT policy for stakeholders on data_access_config
-- This allows stakeholders to see their project configurations after insert/update
-- The existing "Only admins can view credentials" policy will be dropped and replaced

DROP POLICY IF EXISTS "Only admins can view credentials" ON public.data_access_config;
DROP POLICY IF EXISTS "Stakeholders can view data_access_config" ON public.data_access_config;

-- Create new SELECT policy that allows stakeholders to view their project configs
CREATE POLICY "Stakeholders can view data_access_config"
ON public.data_access_config
FOR SELECT
TO authenticated
USING (public.is_project_stakeholder(project_id));