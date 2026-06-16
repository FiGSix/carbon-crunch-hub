
-- ============================================================
-- Fix: Add client_company_members check to 8 RLS policies
-- across onboarding_documents, onboarding_comments,
-- onboarding_activity_log, onboarding_tasks, and storage.objects
-- ============================================================

-- ============================================================
-- 1. storage.objects - INSERT policy
-- ============================================================
DROP POLICY IF EXISTS "Onboarding document uploads for stakeholders" ON storage.objects;
CREATE POLICY "Onboarding document uploads for stakeholders"
ON storage.objects FOR INSERT
WITH CHECK (
  (bucket_id = 'onboarding-documents')
  AND (array_length(string_to_array(name, '/'), 1) >= 3)
  AND ((string_to_array(name, '/'))[2] = (auth.uid())::text)
  AND ((string_to_array(name, '/'))[1] IN (
    SELECT po.id::text
    FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE p.agent_id = auth.uid()
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
       OR EXISTS (
            SELECT 1
            FROM clients c
            JOIN client_company_members ccm ON ccm.client_company_id = c.client_company_id
            WHERE c.id = p.client_reference_id
              AND ccm.user_id = auth.uid()
              AND ccm.status = 'active'
          )
  ))
);

-- ============================================================
-- 2. storage.objects - DELETE policy
-- ============================================================
DROP POLICY IF EXISTS "Users can delete own project documents" ON storage.objects;
CREATE POLICY "Users can delete own project documents"
ON storage.objects FOR DELETE
USING (
  (bucket_id = 'onboarding-documents')
  AND ((string_to_array(name, '/'))[1] IN (
    SELECT po.id::text
    FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE p.agent_id = auth.uid()
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
       OR EXISTS (
            SELECT 1
            FROM clients c
            JOIN client_company_members ccm ON ccm.client_company_id = c.client_company_id
            WHERE c.id = p.client_reference_id
              AND ccm.user_id = auth.uid()
              AND ccm.status = 'active'
          )
  ))
);

-- ============================================================
-- 3. onboarding_documents - INSERT policy
-- ============================================================
DROP POLICY IF EXISTS "Stakeholders can insert documents" ON public.onboarding_documents;
CREATE POLICY "Stakeholders can insert documents"
ON public.onboarding_documents FOR INSERT
WITH CHECK (
  (uploaded_by = auth.uid())
  AND EXISTS (
    SELECT 1
    FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE po.id = onboarding_documents.project_id
      AND (
        p.client_id = auth.uid()
        OR p.agent_id = auth.uid()
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
        OR EXISTS (
             SELECT 1
             FROM clients c
             JOIN client_company_members ccm ON ccm.client_company_id = c.client_company_id
             WHERE c.id = p.client_reference_id
               AND ccm.user_id = auth.uid()
               AND ccm.status = 'active'
           )
      )
  )
);

-- ============================================================
-- 4. onboarding_documents - ALL policy
-- ============================================================
DROP POLICY IF EXISTS "Stakeholders can manage documents" ON public.onboarding_documents;
CREATE POLICY "Stakeholders can manage documents"
ON public.onboarding_documents FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE po.id = onboarding_documents.project_id
      AND (
        p.client_id = auth.uid()
        OR p.agent_id = auth.uid()
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
        OR EXISTS (
             SELECT 1
             FROM clients c
             JOIN client_company_members ccm ON ccm.client_company_id = c.client_company_id
             WHERE c.id = p.client_reference_id
               AND ccm.user_id = auth.uid()
               AND ccm.status = 'active'
           )
      )
  )
);

-- ============================================================
-- 5. onboarding_documents - SELECT policy
-- ============================================================
DROP POLICY IF EXISTS "Users can view documents" ON public.onboarding_documents;
CREATE POLICY "Users can view documents"
ON public.onboarding_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE po.id = onboarding_documents.project_id
      AND (
        p.client_id = auth.uid()
        OR p.agent_id = auth.uid()
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
        OR EXISTS (
             SELECT 1
             FROM clients c
             JOIN client_company_members ccm ON ccm.client_company_id = c.client_company_id
             WHERE c.id = p.client_reference_id
               AND ccm.user_id = auth.uid()
               AND ccm.status = 'active'
           )
      )
  )
);

-- ============================================================
-- 6. onboarding_comments - SELECT policy
-- ============================================================
DROP POLICY IF EXISTS "Users can view comments" ON public.onboarding_comments;
CREATE POLICY "Users can view comments"
ON public.onboarding_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE po.id = onboarding_comments.project_id
      AND (
        p.client_id = auth.uid()
        OR p.agent_id = auth.uid()
        OR p.client_reference_id IN (SELECT c.id FROM clients c WHERE c.user_id = auth.uid())
        OR is_current_user_admin()
        OR EXISTS (
             SELECT 1
             FROM clients c
             JOIN client_company_members ccm ON ccm.client_company_id = c.client_company_id
             WHERE c.id = p.client_reference_id
               AND ccm.user_id = auth.uid()
               AND ccm.status = 'active'
           )
      )
  )
);

-- ============================================================
-- 7. onboarding_activity_log - SELECT policy
-- ============================================================
DROP POLICY IF EXISTS "Users can view activity log" ON public.onboarding_activity_log;
CREATE POLICY "Users can view activity log"
ON public.onboarding_activity_log FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE po.id = onboarding_activity_log.project_id
      AND (
        p.client_id = auth.uid()
        OR p.agent_id = auth.uid()
        OR p.client_reference_id IN (SELECT c.id FROM clients c WHERE c.user_id = auth.uid())
        OR is_current_user_admin()
        OR EXISTS (
             SELECT 1
             FROM clients c
             JOIN client_company_members ccm ON ccm.client_company_id = c.client_company_id
             WHERE c.id = p.client_reference_id
               AND ccm.user_id = auth.uid()
               AND ccm.status = 'active'
           )
      )
  )
);

-- ============================================================
-- 8. onboarding_tasks - SELECT policy
-- ============================================================
DROP POLICY IF EXISTS "Users can view tasks" ON public.onboarding_tasks;
CREATE POLICY "Users can view tasks"
ON public.onboarding_tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE po.id = onboarding_tasks.project_id
      AND (
        p.client_id = auth.uid()
        OR p.agent_id = auth.uid()
        OR p.client_reference_id IN (SELECT c.id FROM clients c WHERE c.user_id = auth.uid())
        OR is_current_user_admin()
        OR EXISTS (
             SELECT 1
             FROM clients c
             JOIN client_company_members ccm ON ccm.client_company_id = c.client_company_id
             WHERE c.id = p.client_reference_id
               AND ccm.user_id = auth.uid()
               AND ccm.status = 'active'
           )
      )
  )
);
