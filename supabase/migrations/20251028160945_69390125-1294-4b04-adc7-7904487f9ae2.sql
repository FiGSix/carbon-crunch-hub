-- Add indexes to optimize portfolio size queries during proposal creation
-- These indexes dramatically speed up agent and client portfolio calculations

-- Index for agent portfolio queries (sum of system_size_kwp by agent)
CREATE INDEX IF NOT EXISTS idx_proposals_agent_size 
ON proposals(agent_id, system_size_kwp) 
WHERE system_size_kwp IS NOT NULL AND deleted_at IS NULL;

-- Index for client portfolio queries (sum of system_size_kwp by client)
CREATE INDEX IF NOT EXISTS idx_proposals_client_size 
ON proposals(client_reference_id, system_size_kwp) 
WHERE system_size_kwp IS NOT NULL AND deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON INDEX idx_proposals_agent_size IS 'Optimizes portfolio size calculations for agent commission tiers';
COMMENT ON INDEX idx_proposals_client_size IS 'Optimizes portfolio size calculations for client share percentages';