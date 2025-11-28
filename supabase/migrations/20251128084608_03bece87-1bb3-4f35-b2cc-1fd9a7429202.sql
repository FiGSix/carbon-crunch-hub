-- Fix Storage Policy Auto-Qualification Bug
-- Extract name reference outside subquery to avoid PostgreSQL auto-qualification

-- Fix Storage INSERT Policy
DROP POLICY IF EXISTS "Onboarding document uploads for stakeholders" ON storage.objects;

CREATE POLICY "Onboarding document uploads for stakeholders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'onboarding-documents'
  AND array_length(string_to_array(name, '/'), 1) >= 3
  AND (string_to_array(name, '/'))[2] = auth.uid()::text
  -- Extract project_id OUTSIDE the subquery to avoid PostgreSQL auto-qualification
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

-- Fix Storage DELETE Policy
DROP POLICY IF EXISTS "Users can delete own project documents" ON storage.objects;

CREATE POLICY "Users can delete own project documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'onboarding-documents'
  -- Extract project_id OUTSIDE the subquery to avoid PostgreSQL auto-qualification
  AND (string_to_array(name, '/'))[1] IN (
    SELECT po.id::text
    FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE (
      p.client_id = auth.uid()
      OR p.agent_id = auth.uid()
      OR p.client_reference_id IN (SELECT clients.id FROM clients WHERE clients.user_id = auth.uid())
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