DROP POLICY IF EXISTS proposals_insert_unified ON public.proposals;

CREATE POLICY proposals_insert_unified
ON public.proposals
FOR INSERT
WITH CHECK (
  auth.uid() = agent_id
  AND (
    is_current_user_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.deleted_at IS NULL
        AND (
          (p.role = 'agent' AND p.agent_status = 'active')
          OR (p.role = 'super_partner' AND COALESCE(p.can_create_proposals, false) = true)
        )
    )
  )
);