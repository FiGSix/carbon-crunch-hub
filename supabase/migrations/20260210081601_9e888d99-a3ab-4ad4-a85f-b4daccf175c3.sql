
-- Allow clients to insert proposals for their own projects
-- This sits alongside the existing proposals_insert_unified policy (which handles agents)
CREATE POLICY "clients_can_submit_projects"
ON public.proposals
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must have client role and not be soft-deleted
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'client'
    AND deleted_at IS NULL
  )
  -- Client must set client_id to their own uid
  AND client_id = auth.uid()
);
