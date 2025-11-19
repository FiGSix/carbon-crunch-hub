-- Add company_id to agent_invitations table to track inviter's company
ALTER TABLE agent_invitations 
ADD COLUMN company_id UUID REFERENCES companies(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_agent_invitations_company_id 
ON agent_invitations(company_id);