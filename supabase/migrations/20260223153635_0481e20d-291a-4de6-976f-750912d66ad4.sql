
DROP POLICY IF EXISTS "proposals_update_unified" ON public.proposals;

CREATE POLICY "proposals_update_unified"
ON public.proposals
FOR UPDATE
TO authenticated
USING (
  deleted_at IS NULL
  AND signed_at IS NULL
  AND status NOT IN ('approved', 'rejected', 'signed')
  AND (
    -- Own proposal (agent)
    auth.uid() = agent_id
    -- Company member of the agent (includes team leads)
    OR EXISTS (
      SELECT 1
      FROM company_members cm1
      JOIN company_members cm2 ON cm1.company_id = cm2.company_id
      WHERE cm1.user_id = auth.uid()
        AND cm2.user_id = agent_id
        AND cm1.status = 'active'
        AND cm2.status = 'active'
    )
    -- Admin
    OR is_current_user_admin()
  )
);
