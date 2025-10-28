-- Create unified helper function for proposal access control
CREATE OR REPLACE FUNCTION public.can_view_proposal(
  proposal_agent_id UUID,
  proposal_client_id UUID,
  proposal_client_reference_id UUID,
  proposal_invitation_token TEXT,
  proposal_invitation_expires_at TIMESTAMPTZ,
  proposal_deleted_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Not deleted
    proposal_deleted_at IS NULL
    AND (
      -- User is the agent
      proposal_agent_id = auth.uid()
      OR
      -- User is in same company as agent
      EXISTS (
        SELECT 1
        FROM company_members cm1
        JOIN company_members cm2 ON cm1.company_id = cm2.company_id
        WHERE cm1.user_id = auth.uid()
          AND cm2.user_id = proposal_agent_id
          AND cm1.status = 'active'
          AND cm2.status = 'active'
      )
      OR
      -- User is the client
      proposal_client_id = auth.uid()
      OR
      -- User is the client reference
      is_proposal_client(proposal_client_reference_id)
      OR
      -- User is admin
      is_current_user_admin()
      OR
      -- Valid token access
      (
        proposal_invitation_token IS NOT NULL
        AND proposal_invitation_expires_at > now()
        AND current_setting('request.invitation_token', true) = proposal_invitation_token
      )
    )
$$;

-- Drop all existing SELECT policies on proposals
DROP POLICY IF EXISTS "proposals_select_policy" ON public.proposals;
DROP POLICY IF EXISTS "Agents can view company proposals" ON public.proposals;
DROP POLICY IF EXISTS "proposals_unified_select" ON public.proposals;

-- Create single unified SELECT policy
CREATE POLICY "proposals_select_unified"
ON public.proposals
FOR SELECT
TO authenticated
USING (
  can_view_proposal(
    agent_id,
    client_id,
    client_reference_id,
    invitation_token,
    invitation_expires_at,
    deleted_at
  )
);

-- Drop old INSERT policy
DROP POLICY IF EXISTS "proposals_insert_policy_with_approval_check" ON public.proposals;
DROP POLICY IF EXISTS "proposals_insert" ON public.proposals;

-- Create unified INSERT policy
CREATE POLICY "proposals_insert_unified"
ON public.proposals
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = agent_id
  AND (
    is_current_user_admin()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'agent'
        AND agent_status = 'active'
    )
  )
);

-- Drop old UPDATE policy
DROP POLICY IF EXISTS "proposals_update_policy" ON public.proposals;
DROP POLICY IF EXISTS "proposals_update" ON public.proposals;

-- Create unified UPDATE policy
CREATE POLICY "proposals_update_unified"
ON public.proposals
FOR UPDATE
TO authenticated
USING (
  deleted_at IS NULL
  AND (
    auth.uid() = agent_id
    OR is_current_user_admin()
  )
);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_proposals_agent_id ON public.proposals(agent_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client_id ON public.proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client_reference_id ON public.proposals(client_reference_id);
CREATE INDEX IF NOT EXISTS idx_proposals_deleted_at ON public.proposals(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_company_members_user_status ON public.company_members(user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_company_members_company_status ON public.company_members(company_id, status) WHERE status = 'active';

-- Comment on the function
COMMENT ON FUNCTION public.can_view_proposal IS 'Unified access control function for proposals - handles agent, company, client, admin, and token access';