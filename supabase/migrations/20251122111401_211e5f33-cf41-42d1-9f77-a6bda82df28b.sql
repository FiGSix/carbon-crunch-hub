-- Function to recalculate client share percentage for proposals based on cumulative portfolio
CREATE OR REPLACE FUNCTION recalculate_proposal_client_shares()
RETURNS TABLE(proposal_id UUID, old_share NUMERIC, new_share NUMERIC, portfolio_kwp NUMERIC) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH proposal_cumulative_portfolio AS (
    -- Calculate cumulative portfolio for each proposal at its creation time
    SELECT 
      p1.id as proposal_id,
      p1.agent_id,
      p1.created_at,
      p1.client_share_percentage as old_share,
      p1.client_share_override_enabled,
      -- Sum all proposals for the same agent created BEFORE this one
      COALESCE(
        (SELECT SUM(p2.system_size_kwp)
         FROM proposals p2
         WHERE p2.agent_id = p1.agent_id
           AND p2.created_at < p1.created_at
           AND p2.deleted_at IS NULL
           AND p2.archived_at IS NULL
           AND p2.system_size_kwp IS NOT NULL),
        0
      ) as cumulative_portfolio_kwp
    FROM proposals p1
    WHERE p1.deleted_at IS NULL
      AND p1.archived_at IS NULL
      AND p1.system_size_kwp IS NOT NULL
  ),
  calculated_shares AS (
    SELECT 
      pcp.proposal_id,
      pcp.old_share,
      pcp.client_share_override_enabled,
      pcp.cumulative_portfolio_kwp,
      -- Apply correct tiered client share percentage
      CASE
        WHEN pcp.cumulative_portfolio_kwp >= 30000 THEN 70
        WHEN pcp.cumulative_portfolio_kwp >= 20000 THEN 68.25
        WHEN pcp.cumulative_portfolio_kwp >= 10000 THEN 66.5
        WHEN pcp.cumulative_portfolio_kwp >= 5000 THEN 63
        ELSE 60.20
      END as new_share
    FROM proposal_cumulative_portfolio pcp
  )
  -- Update proposals where share is incorrect and not overridden
  UPDATE proposals p
  SET 
    client_share_percentage = cs.new_share,
    agent_portfolio_kwp = cs.cumulative_portfolio_kwp,
    updated_at = NOW()
  FROM calculated_shares cs
  WHERE p.id = cs.proposal_id
    AND (cs.client_share_override_enabled = false OR cs.client_share_override_enabled IS NULL)
    AND p.client_share_percentage != cs.new_share
  RETURNING 
    p.id as proposal_id,
    cs.old_share,
    cs.new_share,
    cs.cumulative_portfolio_kwp as portfolio_kwp;
END;
$$;

COMMENT ON FUNCTION recalculate_proposal_client_shares() IS 
'Recalculates client share percentages for all proposals based on the cumulative portfolio at creation time. Only updates proposals without client share overrides.';
