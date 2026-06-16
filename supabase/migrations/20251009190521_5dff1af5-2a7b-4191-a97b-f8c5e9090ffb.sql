-- Update RLS policy on proposals table to prevent clients from deleting proposals
-- Clients should only be able to approve/reject, not delete

-- Drop existing delete policy
DROP POLICY IF EXISTS "proposals_delete_policy" ON public.proposals;

-- Create new delete policy that only allows agents and admins
CREATE POLICY "proposals_delete_policy_agents_only" 
ON public.proposals 
FOR DELETE 
USING (
  (auth.uid() = agent_id) 
  OR is_current_user_admin()
);