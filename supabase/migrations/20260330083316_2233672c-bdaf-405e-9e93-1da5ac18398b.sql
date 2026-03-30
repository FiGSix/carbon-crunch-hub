-- 1. Fix project_onboarding UPDATE policy: add client company member check
DROP POLICY IF EXISTS "Stakeholders can update onboarding" ON project_onboarding;
CREATE POLICY "Stakeholders can update onboarding" ON project_onboarding
FOR UPDATE USING (
  is_current_user_admin()
  OR EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = project_onboarding.proposal_id
    AND (
      p.agent_id = auth.uid()
      OR p.client_id = auth.uid()
      OR p.client_reference_id = auth.uid()
      OR EXISTS (SELECT 1 FROM clients WHERE id = p.client_reference_id AND user_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM company_members cm1
        JOIN company_members cm2 ON cm1.company_id = cm2.company_id
        WHERE cm1.user_id = auth.uid() AND cm2.user_id = p.agent_id
        AND cm1.status = 'active' AND cm2.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM clients c
        JOIN client_company_members ccm ON ccm.client_company_id = c.client_company_id
        WHERE c.id = p.client_reference_id
        AND ccm.user_id = auth.uid() AND ccm.status = 'active'
      )
    )
  )
);

-- 2. Fix storage SELECT: "Users can view own project documents"
DROP POLICY IF EXISTS "Users can view own project documents" ON storage.objects;
CREATE POLICY "Users can view own project documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'onboarding-documents'
  AND (string_to_array(name, '/'))[1] IN (
    SELECT po.id::text
    FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE p.client_id = auth.uid()
      OR p.agent_id = auth.uid()
      OR p.client_reference_id IN (SELECT c.id FROM clients c WHERE c.user_id = auth.uid())
      OR is_current_user_admin()
      OR EXISTS (
        SELECT 1 FROM company_members cm1
        JOIN company_members cm2 ON cm1.company_id = cm2.company_id
        WHERE cm1.user_id = auth.uid() AND cm2.user_id = p.agent_id
        AND cm1.status = 'active' AND cm2.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM clients c
        JOIN client_company_members ccm ON ccm.client_company_id = c.client_company_id
        WHERE c.id = p.client_reference_id
        AND ccm.user_id = auth.uid() AND ccm.status = 'active'
      )
  )
);

-- 3. Fix storage SELECT: "Authorized users can read onboarding documents"
DROP POLICY IF EXISTS "Authorized users can read onboarding documents" ON storage.objects;
CREATE POLICY "Authorized users can read onboarding documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'onboarding-documents'
  AND (string_to_array(name, '/'))[1] IN (
    SELECT po.id::text
    FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE p.agent_id = auth.uid()
      OR p.client_id = auth.uid()
      OR p.client_reference_id IN (SELECT c.id FROM clients c WHERE c.user_id = auth.uid())
      OR is_current_user_admin()
      OR EXISTS (
        SELECT 1 FROM company_members cm1
        JOIN company_members cm2 ON cm1.company_id = cm2.company_id
        WHERE cm1.user_id = auth.uid() AND cm2.user_id = p.agent_id
        AND cm1.status = 'active' AND cm2.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM clients c
        JOIN client_company_members ccm ON ccm.client_company_id = c.client_company_id
        WHERE c.id = p.client_reference_id
        AND ccm.user_id = auth.uid() AND ccm.status = 'active'
      )
  )
);