-- Drop overly permissive storage policy
DROP POLICY IF EXISTS "Authenticated users can read onboarding documents" ON storage.objects;

-- Create secure policy that checks project access
CREATE POLICY "Authorized users can read onboarding documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'onboarding-documents'
  AND (
    -- Admin access
    is_current_user_admin()
    OR
    -- Check if user has access to the project via project_onboarding
    EXISTS (
      SELECT 1
      FROM project_onboarding po
      JOIN proposals p ON p.id = po.proposal_id
      WHERE 
        -- Match the folder structure: legacy-{project_id}/filename.pdf
        (storage.foldername(name))[1] LIKE 'legacy-%'
        AND po.id::text = REPLACE((storage.foldername(name))[1], 'legacy-', '')
        AND (
          -- Client access (direct or via client reference)
          p.client_id = auth.uid() 
          OR p.client_reference_id IN (
            SELECT id FROM clients WHERE user_id = auth.uid()
          )
          -- Agent who created the proposal
          OR p.agent_id = auth.uid()
          -- Agent from same company as proposal creator
          OR EXISTS (
            SELECT 1
            FROM company_members cm1
            JOIN company_members cm2 ON cm1.company_id = cm2.company_id
            WHERE cm1.user_id = auth.uid()
              AND cm2.user_id = p.agent_id
              AND cm1.status = 'active'
              AND cm2.status = 'active'
          )
        )
    )
  )
);