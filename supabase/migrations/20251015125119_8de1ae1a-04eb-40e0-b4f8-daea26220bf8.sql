-- Add explicit INSERT policy for onboarding_documents
CREATE POLICY "Stakeholders can insert documents"
ON public.onboarding_documents
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.project_onboarding po
    JOIN public.proposals p ON p.id = po.proposal_id
    WHERE po.id = onboarding_documents.project_id
      AND (
        p.client_id = auth.uid()
        OR p.agent_id = auth.uid()
        OR p.client_reference_id IN (
          SELECT c.id FROM public.clients c WHERE c.user_id = auth.uid()
        )
        OR is_current_user_admin()
      )
  )
);