-- Drop old insert policy if it exists
DROP POLICY IF EXISTS "proposals_insert_policy" ON public.proposals;
DROP POLICY IF EXISTS "proposals_insert_policy_with_approval_check" ON public.proposals;

-- Create updated insert policy with agent approval check
CREATE POLICY "proposals_insert_policy_with_approval_check" 
ON public.proposals 
FOR INSERT 
TO authenticated 
WITH CHECK (
  (auth.uid() = agent_id) 
  AND 
  (
    -- Check if user is admin (bypass approval check) OR agent with active status
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (
        role = 'admin'
        OR (role = 'agent' AND agent_status = 'active')
      )
    )
  )
);