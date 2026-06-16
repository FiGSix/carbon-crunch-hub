-- Comprehensive Team Member Access Policy Fix
-- Allows team members in the same company to view, edit, upload, and manage onboarding data

-- 1. Fix onboarding_fields Policies
DROP POLICY IF EXISTS "Stakeholders can update fields" ON onboarding_fields;
DROP POLICY IF EXISTS "Users can view project fields" ON onboarding_fields;

CREATE POLICY "Stakeholders can update fields"
ON onboarding_fields
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE po.id = onboarding_fields.project_id
      AND (
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

CREATE POLICY "Users can view project fields"
ON onboarding_fields
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE po.id = onboarding_fields.project_id
      AND (
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

-- 2. Fix project_onboarding UPDATE Policy
DROP POLICY IF EXISTS "Stakeholders can update onboarding" ON project_onboarding;

CREATE POLICY "Stakeholders can update onboarding"
ON project_onboarding
FOR UPDATE
TO authenticated
USING (
  is_current_user_admin()
  OR EXISTS (
    SELECT 1
    FROM proposals p
    WHERE p.id = project_onboarding.proposal_id
      AND (
        p.agent_id = auth.uid()
        OR p.client_id = auth.uid()
        OR p.client_reference_id = auth.uid()
        OR p.client_reference_id IN (SELECT clients.id FROM clients WHERE clients.user_id = auth.uid())
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

-- 3. Fix onboarding_documents Policies
DROP POLICY IF EXISTS "Users can view documents" ON onboarding_documents;
DROP POLICY IF EXISTS "Stakeholders can manage documents" ON onboarding_documents;

CREATE POLICY "Users can view documents"
ON onboarding_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE po.id = onboarding_documents.project_id
      AND (
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

CREATE POLICY "Stakeholders can manage documents"
ON onboarding_documents
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE po.id = onboarding_documents.project_id
      AND (
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

-- 4. Fix Storage SELECT Policies
DROP POLICY IF EXISTS "Users can view own project documents" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can read onboarding documents" ON storage.objects;

CREATE POLICY "Users can view own project documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'onboarding-documents'
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

CREATE POLICY "Authorized users can read onboarding documents"
ON storage.objects
FOR SELECT
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