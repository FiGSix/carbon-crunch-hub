-- Fix remaining circular dependency in proposals policies
-- The issue is that proposals policies are querying the clients table directly

-- Create a security definer function to check if user is a client for a proposal
CREATE OR REPLACE FUNCTION public.is_proposal_client(proposal_client_reference_id uuid)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM clients 
    WHERE id = proposal_client_reference_id 
    AND user_id = auth.uid()
  );
$$;

-- Drop and recreate the problematic proposals policies
DROP POLICY IF EXISTS "proposals_select_policy" ON proposals;
DROP POLICY IF EXISTS "proposals_delete_policy" ON proposals;

-- Create new proposals policies using the security definer function
CREATE POLICY "proposals_select_policy" ON proposals
FOR SELECT USING (
  deleted_at IS NULL AND (
    auth.uid() = agent_id OR 
    auth.uid() = client_id OR 
    public.is_current_user_admin() OR
    public.is_proposal_client(client_reference_id) OR
    (invitation_token IS NOT NULL AND 
     invitation_expires_at > now() AND 
     current_setting('request.invitation_token', true) = invitation_token)
  )
);

CREATE POLICY "proposals_delete_policy" ON proposals
FOR DELETE USING (
  auth.uid() = agent_id OR 
  auth.uid() = client_id OR 
  public.is_current_user_admin() OR
  public.is_proposal_client(client_reference_id)
);