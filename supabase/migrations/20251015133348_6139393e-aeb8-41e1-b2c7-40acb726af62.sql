-- Drop existing INSERT policies for onboarding-documents bucket
DROP POLICY IF EXISTS "Users can upload onboarding documents" ON storage.objects;
DROP POLICY IF EXISTS "Stakeholders can upload onboarding documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload onboarding documents" ON storage.objects;

-- Create unified INSERT policy for onboarding-documents with project-first folder structure
CREATE POLICY "Project stakeholders can upload onboarding documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'onboarding-documents'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE po.id::text = (storage.foldername(name))[1]
    AND (
      p.agent_id = auth.uid()
      OR p.client_id = auth.uid()
      OR p.client_reference_id IN (
        SELECT c.id FROM clients c WHERE c.user_id = auth.uid()
      )
      OR public.is_current_user_admin()
    )
  )
);