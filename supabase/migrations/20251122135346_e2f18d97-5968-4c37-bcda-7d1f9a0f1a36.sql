-- Step 1: Add client_portfolio_kwp column to track individual client portfolio
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS client_portfolio_kwp NUMERIC DEFAULT 0;

-- Step 2: Create index for efficient client portfolio calculations
CREATE INDEX IF NOT EXISTS idx_proposals_client_ref_created 
ON proposals(client_reference_id, created_at) 
WHERE deleted_at IS NULL AND archived_at IS NULL;

-- Step 3: Drop old function and create CLIENT-based version
DROP FUNCTION IF EXISTS recalculate_proposal_client_shares();

CREATE FUNCTION recalculate_proposal_client_shares()
RETURNS TABLE(proposal_id UUID, old_share NUMERIC, new_share NUMERIC, client_portfolio_kwp NUMERIC, agent_portfolio_kwp NUMERIC) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH proposal_client_portfolio AS (
    -- Calculate cumulative CLIENT portfolio for each proposal at its creation time
    SELECT 
      p1.id as proposal_id,
      p1.client_reference_id,
      p1.agent_id,
      p1.created_at,
      p1.client_share_percentage as old_share,
      p1.client_share_override_enabled,
      -- Sum all proposals for the same CLIENT created BEFORE this one
      COALESCE(
        (SELECT SUM(p2.system_size_kwp)
         FROM proposals p2
         WHERE p2.client_reference_id = p1.client_reference_id
           AND p2.created_at < p1.created_at
           AND p2.deleted_at IS NULL
           AND p2.archived_at IS NULL
           AND p2.system_size_kwp IS NOT NULL),
        0
      ) as client_cumulative_kwp,
      -- Sum all proposals for the same AGENT created BEFORE this one (for agent commission)
      COALESCE(
        (SELECT SUM(p3.system_size_kwp)
         FROM proposals p3
         WHERE p3.agent_id = p1.agent_id
           AND p3.created_at < p1.created_at
           AND p3.deleted_at IS NULL
           AND p3.archived_at IS NULL
           AND p3.system_size_kwp IS NOT NULL),
        0
      ) as agent_cumulative_kwp
    FROM proposals p1
    WHERE p1.deleted_at IS NULL
      AND p1.archived_at IS NULL
      AND p1.system_size_kwp IS NOT NULL
      AND p1.client_reference_id IS NOT NULL
  ),
  calculated_shares AS (
    SELECT 
      pcp.proposal_id,
      pcp.old_share,
      pcp.client_share_override_enabled,
      pcp.client_cumulative_kwp,
      pcp.agent_cumulative_kwp,
      -- Apply correct tiered CLIENT share percentage based on CLIENT portfolio
      CASE
        WHEN pcp.client_cumulative_kwp >= 30000 THEN 70
        WHEN pcp.client_cumulative_kwp >= 20000 THEN 68.25
        WHEN pcp.client_cumulative_kwp >= 10000 THEN 66.5
        WHEN pcp.client_cumulative_kwp >= 5000 THEN 63
        ELSE 60.20
      END as new_share
    FROM proposal_client_portfolio pcp
  )
  -- Update proposals where share is incorrect and not overridden
  UPDATE proposals p
  SET 
    client_share_percentage = cs.new_share,
    client_portfolio_kwp = cs.client_cumulative_kwp,
    agent_portfolio_kwp = cs.agent_cumulative_kwp,
    updated_at = NOW()
  FROM calculated_shares cs
  WHERE p.id = cs.proposal_id
    AND (cs.client_share_override_enabled = false OR cs.client_share_override_enabled IS NULL)
    AND p.client_share_percentage != cs.new_share
  RETURNING 
    p.id as proposal_id,
    cs.old_share,
    cs.new_share,
    cs.client_cumulative_kwp as client_portfolio_kwp,
    cs.agent_cumulative_kwp as agent_portfolio_kwp;
END;
$$;

COMMENT ON FUNCTION recalculate_proposal_client_shares() IS 
'Recalculates client share percentages for all proposals based on the CLIENT''s cumulative portfolio at creation time. Agent portfolio is tracked separately for agent commission calculations. Only updates proposals without client share overrides.';