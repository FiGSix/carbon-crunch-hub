-- Restore dashboard RPC with correct 6-year carbon price sum (R891.71)
-- Only change from previous version: 872.75 → 891.71

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics_by_stage(
  user_id_param UUID,
  user_role_param TEXT
)
RETURNS TABLE (
  audit_ready_mwp NUMERIC,
  audit_ready_revenue NUMERIC,
  audit_review_requests BIGINT,
  onboarding_mwp NUMERIC,
  pending_approval_mwp NUMERIC,
  pending_approval_revenue NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH accessible_proposals AS (
    SELECT 
      p.id,
      p.system_size_kwp,
      p.carbon_credits,
      p.signed_at,
      p.status,
      -- Use stored values directly - these are proposal-specific
      p.client_share_percentage,
      p.agent_commission_percentage,
      p.agent_id,
      po.audit_ready,
      po.admin_validated,
      po.onboarding_complete,
      po.submitted_for_review
    FROM proposals p
    LEFT JOIN project_onboarding po ON po.proposal_id = p.id
    WHERE p.archived_at IS NULL
      AND p.deleted_at IS NULL
      AND p.status != 'rejected'
      AND (
        CASE user_role_param
          WHEN 'admin' THEN true
          WHEN 'agent' THEN (
            p.agent_id = user_id_param
            OR EXISTS (
              SELECT 1
              FROM company_members cm1
              JOIN company_members cm2 ON cm1.company_id = cm2.company_id
              WHERE cm1.user_id = user_id_param
                AND cm2.user_id = p.agent_id
                AND cm1.status = 'active'
                AND cm2.status = 'active'
            )
          )
          WHEN 'client' THEN (
            p.client_id = user_id_param OR 
            p.client_reference_id IN (
              SELECT id FROM clients WHERE user_id = user_id_param
            )
          )
          ELSE false
        END
      )
  ),
  -- Tiered carbon pricing (R per credit per year)
  carbon_prices AS (
    SELECT 
      -- Sum of 6 years of tiered pricing matching CARBON_PRICES constants:
      -- 2025: R97.34 + 2026: R127.03 + 2027: R143.12 + 2028: R158.79 + 2029: R174.88 + 2030: R190.55 = R891.71
      891.71 AS total_6yr_price
  )
  SELECT
    -- Card 1: Audit Ready Projects (signed + audit_ready = true)
    COALESCE(
      SUM(CASE 
        WHEN signed_at IS NOT NULL 
          AND audit_ready = true 
        THEN system_size_kwp 
        ELSE 0 
      END) / 1000.0, 
      0
    )::NUMERIC as audit_ready_mwp,
    
    -- Card 2: Audit Ready Revenue (using stored percentages and tiered pricing)
    COALESCE(
      SUM(CASE 
        WHEN signed_at IS NOT NULL 
          AND audit_ready = true 
          AND carbon_credits IS NOT NULL
        THEN 
          CASE user_role_param
            WHEN 'client' THEN 
              -- Client revenue: credits * tiered_price * client_share%
              carbon_credits * (SELECT total_6yr_price FROM carbon_prices) * COALESCE(client_share_percentage, 60.20) / 100
            WHEN 'agent' THEN 
              -- Agent revenue: credits * tiered_price * agent_commission%
              carbon_credits * (SELECT total_6yr_price FROM carbon_prices) * COALESCE(agent_commission_percentage, 0) / 100
            WHEN 'admin' THEN 
              -- Platform revenue: credits * tiered_price * (100 - client% - agent%)
              carbon_credits * (SELECT total_6yr_price FROM carbon_prices) * (100 - COALESCE(client_share_percentage, 60.20) - COALESCE(agent_commission_percentage, 0)) / 100
            ELSE 0
          END
        ELSE 0 
      END), 
      0
    )::NUMERIC as audit_ready_revenue,
    
    -- Card 3: Audit Review Requests
    COALESCE(
      COUNT(CASE 
        WHEN signed_at IS NOT NULL 
          AND submitted_for_review = true 
          AND (audit_ready = false OR audit_ready IS NULL)
          AND (admin_validated = false OR admin_validated IS NULL)
        THEN 1 
        ELSE NULL 
      END), 
      0
    )::BIGINT as audit_review_requests,
    
    -- Card 4: Onboarding MWp
    COALESCE(
      SUM(CASE 
        WHEN signed_at IS NOT NULL 
          AND (onboarding_complete = false OR onboarding_complete IS NULL)
        THEN system_size_kwp 
        ELSE 0 
      END) / 1000.0, 
      0
    )::NUMERIC as onboarding_mwp,
    
    -- Card 5: Pending Approval MWp
    COALESCE(
      SUM(CASE 
        WHEN signed_at IS NULL 
          AND status IN ('pending', 'draft', 'sent', 'delivered', 'opened', 'stale')
        THEN system_size_kwp 
        ELSE 0 
      END) / 1000.0, 
      0
    )::NUMERIC as pending_approval_mwp,
    
    -- Card 6: Pending Approval Revenue (using stored percentages and tiered pricing)
    COALESCE(
      SUM(CASE 
        WHEN signed_at IS NULL 
          AND status IN ('pending', 'draft', 'sent', 'delivered', 'opened', 'stale')
          AND carbon_credits IS NOT NULL
        THEN 
          CASE user_role_param
            WHEN 'client' THEN 
              carbon_credits * (SELECT total_6yr_price FROM carbon_prices) * COALESCE(client_share_percentage, 60.20) / 100
            WHEN 'agent' THEN 
              carbon_credits * (SELECT total_6yr_price FROM carbon_prices) * COALESCE(agent_commission_percentage, 0) / 100
            WHEN 'admin' THEN 
              carbon_credits * (SELECT total_6yr_price FROM carbon_prices) * (100 - COALESCE(client_share_percentage, 60.20) - COALESCE(agent_commission_percentage, 0)) / 100
            ELSE 0
          END
        ELSE 0 
      END), 
      0
    )::NUMERIC as pending_approval_revenue
    
  FROM accessible_proposals;
END;
$$;