-- Restore the correct get_dashboard_metrics_by_stage function
-- with TABLE return type, correct R891.71 tiered pricing, onboarding_complete logic, and role-based revenue

DROP FUNCTION IF EXISTS public.get_dashboard_metrics_by_stage(uuid, text);

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics_by_stage(
  p_user_id uuid DEFAULT NULL,
  p_user_role text DEFAULT 'admin'
)
RETURNS TABLE(
  audit_ready_mwp numeric,
  audit_ready_revenue numeric,
  audit_review_requests bigint,
  onboarding_mwp numeric,
  onboarding_revenue numeric,
  pending_approval_mwp numeric,
  pending_approval_revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Correct 6-year tiered pricing sum: R891.71 per credit
  -- 2025: R97.34, 2026: R127.03, 2027: R143.12, 2028: R158.79, 2029: R174.88, 2030: R190.55
  v_carbon_price_6yr constant numeric := 891.71;
BEGIN
  RETURN QUERY
  WITH user_filter AS (
    SELECT 
      p_user_id as uid,
      p_user_role as urole
  ),
  -- Proposals that are signed AND audit_ready = true
  audit_ready_projects AS (
    SELECT 
      p.id,
      p.system_size_kwp,
      p.carbon_credits,
      p.client_share_percentage,
      p.agent_commission_percentage,
      p.agent_id,
      p.client_reference_id
    FROM proposals p
    INNER JOIN project_onboarding po ON po.proposal_id = p.id
    CROSS JOIN user_filter uf
    WHERE p.signed_at IS NOT NULL
      AND p.archived_at IS NULL
      AND p.deleted_at IS NULL
      AND po.audit_ready = true
      AND (
        uf.urole = 'admin'
        OR (uf.urole = 'agent' AND p.agent_id = uf.uid)
        OR (uf.urole = 'client' AND (
          p.client_id = uf.uid 
          OR p.client_reference_id IN (SELECT c.id FROM clients c WHERE c.user_id = uf.uid)
        ))
      )
  ),
  -- Projects submitted for admin review but not yet validated
  audit_review_projects AS (
    SELECT po.id
    FROM project_onboarding po
    INNER JOIN proposals p ON p.id = po.proposal_id
    CROSS JOIN user_filter uf
    WHERE po.submitted_for_review = true
      AND po.admin_validated = false
      AND p.archived_at IS NULL
      AND p.deleted_at IS NULL
      AND (
        uf.urole = 'admin'
        OR (uf.urole = 'agent' AND p.agent_id = uf.uid)
        OR (uf.urole = 'client' AND (
          p.client_id = uf.uid 
          OR p.client_reference_id IN (SELECT c.id FROM clients c WHERE c.user_id = uf.uid)
        ))
      )
  ),
  -- Signed projects still in onboarding (not onboarding_complete yet)
  onboarding_projects AS (
    SELECT 
      p.id,
      p.system_size_kwp,
      p.carbon_credits,
      p.client_share_percentage,
      p.agent_commission_percentage,
      p.agent_id,
      p.client_reference_id
    FROM proposals p
    INNER JOIN project_onboarding po ON po.proposal_id = p.id
    CROSS JOIN user_filter uf
    WHERE p.signed_at IS NOT NULL
      AND p.archived_at IS NULL
      AND p.deleted_at IS NULL
      AND (po.onboarding_complete = false OR po.onboarding_complete IS NULL)
      AND (
        uf.urole = 'admin'
        OR (uf.urole = 'agent' AND p.agent_id = uf.uid)
        OR (uf.urole = 'client' AND (
          p.client_id = uf.uid 
          OR p.client_reference_id IN (SELECT c.id FROM clients c WHERE c.user_id = uf.uid)
        ))
      )
  ),
  -- Unsigned proposals pending client approval
  pending_approval_projects AS (
    SELECT 
      p.id,
      p.system_size_kwp,
      p.carbon_credits,
      p.client_share_percentage,
      p.agent_commission_percentage,
      p.agent_id,
      p.client_reference_id
    FROM proposals p
    CROSS JOIN user_filter uf
    WHERE p.signed_at IS NULL
      AND p.archived_at IS NULL
      AND p.deleted_at IS NULL
      AND p.status IN ('draft', 'sent', 'delivered', 'opened', 'viewed', 'stale')
      AND (
        uf.urole = 'admin'
        OR (uf.urole = 'agent' AND p.agent_id = uf.uid)
        OR (uf.urole = 'client' AND (
          p.client_id = uf.uid 
          OR p.client_reference_id IN (SELECT c.id FROM clients c WHERE c.user_id = uf.uid)
        ))
      )
  )
  SELECT
    -- Audit Ready MWp
    COALESCE(SUM(ar.system_size_kwp) / 1000.0, 0)::numeric AS audit_ready_mwp,
    -- Audit Ready Revenue (role-based)
    COALESCE(SUM(
      CASE (SELECT urole FROM user_filter)
        WHEN 'client' THEN ar.carbon_credits * v_carbon_price_6yr * (COALESCE(ar.client_share_percentage, 70) / 100.0)
        WHEN 'agent' THEN ar.carbon_credits * v_carbon_price_6yr * (COALESCE(ar.agent_commission_percentage, 4) / 100.0)
        ELSE ar.carbon_credits * v_carbon_price_6yr * ((100 - COALESCE(ar.client_share_percentage, 70) - COALESCE(ar.agent_commission_percentage, 4)) / 100.0)
      END
    ), 0)::numeric AS audit_ready_revenue,
    -- Audit Review Requests count
    (SELECT COUNT(*) FROM audit_review_projects)::bigint AS audit_review_requests,
    -- Onboarding MWp
    COALESCE((SELECT SUM(op.system_size_kwp) / 1000.0 FROM onboarding_projects op), 0)::numeric AS onboarding_mwp,
    -- Onboarding Revenue (role-based)
    COALESCE((SELECT SUM(
      CASE (SELECT urole FROM user_filter)
        WHEN 'client' THEN op.carbon_credits * v_carbon_price_6yr * (COALESCE(op.client_share_percentage, 70) / 100.0)
        WHEN 'agent' THEN op.carbon_credits * v_carbon_price_6yr * (COALESCE(op.agent_commission_percentage, 4) / 100.0)
        ELSE op.carbon_credits * v_carbon_price_6yr * ((100 - COALESCE(op.client_share_percentage, 70) - COALESCE(op.agent_commission_percentage, 4)) / 100.0)
      END
    ) FROM onboarding_projects op), 0)::numeric AS onboarding_revenue,
    -- Pending Approval MWp
    COALESCE((SELECT SUM(pa.system_size_kwp) / 1000.0 FROM pending_approval_projects pa), 0)::numeric AS pending_approval_mwp,
    -- Pending Approval Revenue (role-based)
    COALESCE((SELECT SUM(
      CASE (SELECT urole FROM user_filter)
        WHEN 'client' THEN pa.carbon_credits * v_carbon_price_6yr * (COALESCE(pa.client_share_percentage, 70) / 100.0)
        WHEN 'agent' THEN pa.carbon_credits * v_carbon_price_6yr * (COALESCE(pa.agent_commission_percentage, 4) / 100.0)
        ELSE pa.carbon_credits * v_carbon_price_6yr * ((100 - COALESCE(pa.client_share_percentage, 70) - COALESCE(pa.agent_commission_percentage, 4)) / 100.0)
      END
    ) FROM pending_approval_projects pa), 0)::numeric AS pending_approval_revenue
  FROM audit_ready_projects ar;
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_metrics_by_stage IS 'Dashboard metrics by stage with correct R891.71 6-year tiered pricing, onboarding_complete logic, and role-based revenue calculations';