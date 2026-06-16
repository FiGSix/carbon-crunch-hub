-- Fix 61 proposals with incorrect agent commission percentages
-- Sync agent_commission_percentage with the agent's profile commission_override

-- Update all proposals where agent has a commission_override that differs from stored value
UPDATE proposals p
SET 
  agent_commission_percentage = pr.commission_override,
  updated_at = now()
FROM profiles pr
WHERE p.agent_id = pr.id
  AND pr.commission_override IS NOT NULL
  AND p.agent_commission_percentage IS DISTINCT FROM pr.commission_override
  AND p.deleted_at IS NULL
  AND p.archived_at IS NULL;