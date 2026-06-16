
-- Drop the stale inline RLS policies on onboarding_fields
DROP POLICY IF EXISTS "Stakeholders can update fields" ON public.onboarding_fields;
DROP POLICY IF EXISTS "Users can view project fields" ON public.onboarding_fields;

-- Recreate with canonical is_project_stakeholder() function (same pattern as onboarding_documents, data_access_config, onboarding_comments)
CREATE POLICY "Stakeholders can manage onboarding fields"
  ON public.onboarding_fields
  FOR ALL
  USING (public.is_project_stakeholder(project_id))
  WITH CHECK (public.is_project_stakeholder(project_id));

CREATE POLICY "Stakeholders can view onboarding fields"
  ON public.onboarding_fields
  FOR SELECT
  USING (public.is_project_stakeholder(project_id));
