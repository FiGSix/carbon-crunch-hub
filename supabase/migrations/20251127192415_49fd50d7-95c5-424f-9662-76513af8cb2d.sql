-- Drop both existing conflicting INSERT policies for onboarding-documents bucket
DROP POLICY IF EXISTS "Project stakeholders can upload onboarding documents" ON storage.objects;
DROP POLICY IF EXISTS "Stakeholders can upload to onboarding documents" ON storage.objects;

-- Create a single, corrected INSERT policy using string_to_array to avoid objects.name auto-qualification bug
CREATE POLICY "Onboarding document uploads for stakeholders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'onboarding-documents'
  AND (
    -- Validate path structure: {project_id}/{user_id}/{filename}
    array_length(string_to_array(name, '/'), 1) >= 3
    AND (string_to_array(name, '/'))[2] = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM project_onboarding po
      JOIN proposals p ON p.id = po.proposal_id
      WHERE po.id::text = (string_to_array(name, '/'))[1]
      AND (
        p.agent_id = auth.uid()
        OR p.client_id = auth.uid()
        OR p.client_reference_id IN (SELECT c.id FROM clients c WHERE c.user_id = auth.uid())
        OR public.is_current_user_admin()
      )
    )
  )
);