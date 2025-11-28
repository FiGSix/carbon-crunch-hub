-- Remove Broken Storage DELETE Policies
-- Consolidate to single correct policy that uses IN clause and includes company_members check

-- Drop the two broken DELETE policies
DROP POLICY IF EXISTS "Authenticated users can delete their onboarding documents" ON storage.objects;
DROP POLICY IF EXISTS "Delete own onboarding docs" ON storage.objects;

-- Verify the correct policy exists (create if somehow missing)
DROP POLICY IF EXISTS "Users can delete own project documents" ON storage.objects;

CREATE POLICY "Users can delete own project documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'onboarding-documents'
  AND (string_to_array(name, '/'))[1] IN (
    SELECT po.id::text
    FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE (
      p.agent_id = auth.uid()
      OR p.client_id = auth.uid()
      OR p.client_reference_id IN (SELECT c.id FROM clients c WHERE c.user_id = auth.uid())
      OR is_current_user_admin()
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
);