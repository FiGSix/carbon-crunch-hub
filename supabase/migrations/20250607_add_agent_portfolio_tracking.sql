
-- Add agent_portfolio_kwp column to proposals table to track agent's total portfolio at time of creation
ALTER TABLE proposals 
ADD COLUMN agent_portfolio_kwp DECIMAL(10,2) DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN proposals.agent_portfolio_kwp IS 'Agent total portfolio size in kWp at the time this proposal was created';

-- Create index for performance when querying by agent portfolio size
CREATE INDEX idx_proposals_agent_portfolio_kwp ON proposals(agent_portfolio_kwp);

-- Update existing proposals with current agent portfolio sizes (one-time migration)
-- This will set the agent_portfolio_kwp based on current calculations
DO $$
DECLARE
    agent_record RECORD;
    portfolio_size DECIMAL(10,2);
BEGIN
    -- Loop through all agents who have proposals
    FOR agent_record IN 
        SELECT DISTINCT agent_id 
        FROM proposals 
        WHERE agent_id IS NOT NULL 
        AND archived_at IS NULL 
        AND deleted_at IS NULL
    LOOP
        -- Calculate current portfolio size for this agent
        SELECT COALESCE(SUM(system_size_kwp), 0) INTO portfolio_size
        FROM proposals 
        WHERE agent_id = agent_record.agent_id
        AND archived_at IS NULL 
        AND deleted_at IS NULL
        AND status != 'rejected';
        
        -- Update all proposals for this agent with their current portfolio size
        UPDATE proposals 
        SET agent_portfolio_kwp = portfolio_size
        WHERE agent_id = agent_record.agent_id
        AND agent_portfolio_kwp = 0; -- Only update if not already set
        
    END LOOP;
END $$;
