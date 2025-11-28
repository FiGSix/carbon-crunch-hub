-- Fix Storage INSERT Policy for Team Members
DROP POLICY IF EXISTS "Onboarding document uploads for stakeholders" ON storage.objects;

CREATE POLICY "Onboarding document uploads for stakeholders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'onboarding-documents'
  AND (
    array_length(string_to_array(name, '/'), 1) >= 3
    AND (string_to_array(name, '/'))[2] = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM project_onboarding po
      JOIN proposals p ON p.id = po.proposal_id
      WHERE (po.id)::text = (string_to_array(name, '/'))[1]
      AND (
        p.agent_id = auth.uid()
        OR p.client_id = auth.uid()
        OR p.client_reference_id IN (SELECT c.id FROM clients c WHERE c.user_id = auth.uid())
        OR is_current_user_admin()
        -- Team member check
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

-- Fix Database INSERT Policy for Team Members
DROP POLICY IF EXISTS "Stakeholders can insert documents" ON public.onboarding_documents;

CREATE POLICY "Stakeholders can insert documents"
ON public.onboarding_documents
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE po.id = project_id
    AND (
      p.client_id = auth.uid()
      OR p.agent_id = auth.uid()
      OR p.client_reference_id IN (SELECT c.id FROM clients c WHERE c.user_id = auth.uid())
      OR is_current_user_admin()
      -- Team member check
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

-- Fix Storage DELETE Policy for Team Members
DROP POLICY IF EXISTS "Users can delete own project documents" ON storage.objects;

CREATE POLICY "Users can delete own project documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'onboarding-documents'
  AND EXISTS (
    SELECT 1
    FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE (string_to_array(name, '/'))[1] = (po.id)::text
    AND (
      p.client_id = auth.uid()
      OR p.agent_id = auth.uid()
      OR p.client_reference_id IN (SELECT clients.id FROM clients WHERE clients.user_id = auth.uid())
      OR is_current_user_admin()
      -- Team member check
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