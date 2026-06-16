-- Function: public.is_project_stakeholder
CREATE OR REPLACE FUNCTION public.is_project_stakeholder(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_onboarding po
    JOIN public.proposals p ON p.id = po.proposal_id
    WHERE po.id = _project_id
      AND (
        public.is_current_user_admin()
        OR p.agent_id = auth.uid()
        OR p.client_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.clients c
          WHERE c.id = p.client_reference_id
            AND c.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM public.company_members cm1
          JOIN public.company_members cm2 ON cm1.company_id = cm2.company_id
          WHERE cm1.user_id = auth.uid()
            AND cm2.user_id = p.agent_id
            AND cm1.status = 'active'
            AND cm2.status = 'active'
        )
      )
  );
$$;

-- Ensure RLS is enabled on data_access_config
ALTER TABLE public.data_access_config ENABLE ROW LEVEL SECURITY;

-- Drop legacy/overlapping policies if present
DROP POLICY IF EXISTS "Stakeholders can insert data access config" ON public.data_access_config;
DROP POLICY IF EXISTS "Stakeholders can configure data access" ON public.data_access_config;
DROP POLICY IF EXISTS "Stakeholders can update data access config" ON public.data_access_config;
DROP POLICY IF EXISTS "Stakeholders can delete data access config" ON public.data_access_config;
DROP POLICY IF EXISTS "Admins can insert data access config" ON public.data_access_config;
DROP POLICY IF EXISTS "Admins can update data access config" ON public.data_access_config;
DROP POLICY IF EXISTS "Admins can delete data access config" ON public.data_access_config;

-- Create concise stakeholder policies for write operations
CREATE POLICY "Stakeholders can insert data_access_config"
ON public.data_access_config
FOR INSERT
TO authenticated
WITH CHECK (public.is_project_stakeholder(project_id));

CREATE POLICY "Stakeholders can update data_access_config"
ON public.data_access_config
FOR UPDATE
TO authenticated
USING (public.is_project_stakeholder(project_id))
WITH CHECK (public.is_project_stakeholder(project_id));

CREATE POLICY "Stakeholders can delete data_access_config"
ON public.data_access_config
FOR DELETE
TO authenticated
USING (public.is_project_stakeholder(project_id));