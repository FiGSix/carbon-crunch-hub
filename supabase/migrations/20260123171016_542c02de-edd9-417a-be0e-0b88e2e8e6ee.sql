-- Fix carbon price sum in get_dashboard_metrics_by_stage RPC
-- The previous sum of 872.75 was incorrect; updating to match CARBON_PRICES constants

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
  WITH carbon_prices AS (
    SELECT 
      -- Sum of 6 years of tiered pricing matching CARBON_PRICES constants:
      -- 2025: R97.34 + 2026: R127.03 + 2027: R143.12 + 2028: R158.79 + 2029: R174.88 + 2030: R190.55 = R891.71
      891.71 AS total_6yr_price
  ),
  filtered_proposals AS (
    SELECT 
      p.id,
      p.status,
      p.system_size_kwp,
      p.client_share_percentage,
      p.agent_commission_percentage,
      po.audit_ready,
      po.submitted_for_review
    FROM proposals p
    LEFT JOIN project_onboarding po ON po.proposal_id = p.id
    WHERE p.deleted_at IS NULL
      AND p.archived_at IS NULL
      AND (
        user_role_param = 'admin'
        OR (user_role_param = 'agent' AND p.agent_id = user_id_param)
        OR (user_role_param = 'client' AND (p.client_id = user_id_param OR p.client_reference_id IN (
          SELECT id FROM clients WHERE user_id = user_id_param
        )))
      )
  ),
  audit_ready_projects AS (
    SELECT 
      fp.id,
      fp.system_size_kwp,
      fp.client_share_percentage,
      fp.agent_commission_percentage
    FROM filtered_proposals fp
    WHERE fp.status = 'audit_ready'
      AND fp.audit_ready = true
  ),
  pending_approval_projects AS (
    SELECT 
      fp.id,
      fp.system_size_kwp,
      fp.client_share_percentage,
      fp.agent_commission_percentage
    FROM filtered_proposals fp
    WHERE fp.status = 'pending_approval'
  ),
  review_requests AS (
    SELECT COUNT(*) as cnt
    FROM filtered_proposals fp
    WHERE fp.submitted_for_review = true
      AND fp.audit_ready = false
  ),
  onboarding_projects AS (
    SELECT 
      fp.id,
      fp.system_size_kwp
    FROM filtered_proposals fp
    WHERE fp.status IN ('signed', 'onboarding', 'in_progress')
      AND fp.audit_ready = false
  )
  SELECT
    COALESCE(SUM(arp.system_size_kwp) / 1000.0, 0)::NUMERIC as audit_ready_mwp,
    COALESCE(SUM(
      arp.system_size_kwp * 1.65 * 0.000927 * cp.total_6yr_price * 
      (1 - COALESCE(arp.client_share_percentage, 50) / 100.0) *
      (1 - COALESCE(arp.agent_commission_percentage, 5) / 100.0)
    ), 0)::NUMERIC as audit_ready_revenue,
    (SELECT cnt FROM review_requests)::BIGINT as audit_review_requests,
    COALESCE((SELECT SUM(op.system_size_kwp) / 1000.0 FROM onboarding_projects op), 0)::NUMERIC as onboarding_mwp,
    COALESCE(SUM(pap.system_size_kwp) / 1000.0, 0)::NUMERIC as pending_approval_mwp,
    COALESCE(SUM(
      pap.system_size_kwp * 1.65 * 0.000927 * cp.total_6yr_price * 
      (1 - COALESCE(pap.client_share_percentage, 50) / 100.0) *
      (1 - COALESCE(pap.agent_commission_percentage, 5) / 100.0)
    ), 0)::NUMERIC as pending_approval_revenue
  FROM carbon_prices cp
  LEFT JOIN audit_ready_projects arp ON true
  LEFT JOIN pending_approval_projects pap ON true
  GROUP BY cp.total_6yr_price, (SELECT cnt FROM review_requests);
END;
$$;