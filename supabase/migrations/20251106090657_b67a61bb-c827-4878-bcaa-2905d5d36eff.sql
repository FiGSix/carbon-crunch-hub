-- Add company_id to proposals table for team collaboration
ALTER TABLE proposals ADD COLUMN company_id UUID REFERENCES companies(id);

-- Backfill company_id from agent's company membership
UPDATE proposals p
SET company_id = (
  SELECT cm.company_id 
  FROM company_members cm 
  WHERE cm.user_id = p.agent_id 
  AND cm.status = 'active'
  LIMIT 1
)
WHERE p.company_id IS NULL AND p.agent_id IS NOT NULL;

-- Create index for better query performance
CREATE INDEX idx_proposals_company_id ON proposals(company_id);

-- Drop the old restrictive policy for agents viewing onboarding
DROP POLICY IF EXISTS "Agents can view assigned onboarding" ON project_onboarding;

-- Create new company-based policy for project onboarding
CREATE POLICY "Agents can view company onboarding"
ON project_onboarding
FOR SELECT
TO authenticated
USING (
  is_current_user_agent() AND (
    -- You're the assigned agent
    EXISTS (
      SELECT 1 FROM proposals p 
      WHERE p.id = proposal_id 
      AND p.agent_id = auth.uid()
    )
    -- OR you're in the same active company as the assigned agent
    OR EXISTS (
      SELECT 1 
      FROM proposals p
      JOIN company_members cm_agent ON cm_agent.user_id = p.agent_id
      JOIN company_members cm_user ON cm_user.company_id = cm_agent.company_id
      WHERE p.id = proposal_id
      AND cm_user.user_id = auth.uid()
      AND cm_user.status = 'active'
      AND cm_agent.status = 'active'
    )
  )
);

-- Update proposal SELECT policy to include company members
DROP POLICY IF EXISTS "proposals_select_unified" ON proposals;

CREATE POLICY "proposals_select_unified"
ON proposals
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL AND (
    -- Original agent access
    agent_id = auth.uid()
    -- Company member access
    OR EXISTS (
      SELECT 1
      FROM company_members cm1
      JOIN company_members cm2 ON cm1.company_id = cm2.company_id
      WHERE cm1.user_id = auth.uid()
        AND cm2.user_id = proposals.agent_id
        AND cm1.status = 'active'
        AND cm2.status = 'active'
    )
    -- Client access (unchanged)
    OR client_id = auth.uid()
    OR is_proposal_client(client_reference_id)
    -- Admin access (unchanged)
    OR is_current_user_admin()
    -- Token access (unchanged)
    OR (
      invitation_token IS NOT NULL
      AND invitation_expires_at > now()
      AND current_setting('request.invitation_token', true) = invitation_token
    )
  )
);