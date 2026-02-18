
-- Fix: Restore correct admin/default revenue formula in get_dashboard_metrics_by_stage
-- The Feb 17 migration (20260217130437) accidentally truncated the ELSE branch,
-- removing the platform share calculation (client_share + agent_commission deduction).
-- This restores the correct formula: carbon_credits * price * platform_share_percentage

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics_by_stage(p_user_id uuid DEFAULT NULL::uuid, p_user_role text DEFAULT 'admin'::text)
 RETURNS TABLE(audit_ready_mwp numeric, audit_ready_revenue numeric, audit_review_requests bigint, onboarding_mwp numeric, onboarding_revenue numeric, pending_approval_mwp numeric, pending_approval_revenue numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_carbon_price_6yr constant numeric := 891.71;
BEGIN
  RETURN QUERY
  WITH user_filter AS (
    SELECT 
      p_user_id as uid,
      p_user_role as urole
  ),
  -- Helper: client IDs visible to this user via company membership
  user_company_client_ids AS (
    SELECT c.id
    FROM clients c
    WHERE c.user_id = p_user_id
    UNION
    SELECT c.id
    FROM clients c
    WHERE c.client_company_id IN (
      SELECT ccm.client_company_id 
      FROM client_company_members ccm 
      WHERE ccm.user_id = p_user_id 
        AND ccm.status = 'active'
    )
  ),
  audit_ready_projects AS (
    SELECT 
      p.id, p.system_size_kwp, p.carbon_credits,
      p.client_share_percentage, p.agent_commission_percentage,
      p.agent_id, p.client_reference_id
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
          OR p.client_reference_id IN (SELECT ucci.id FROM user_company_client_ids ucci)
        ))
      )
  ),
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
          OR p.client_reference_id IN (SELECT ucci.id FROM user_company_client_ids ucci)
        ))
      )
  ),
  onboarding_projects AS (
    SELECT 
      p.id, p.system_size_kwp, p.carbon_credits,
      p.client_share_percentage, p.agent_commission_percentage,
      p.agent_id, p.client_reference_id
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
          OR p.client_reference_id IN (SELECT ucci.id FROM user_company_client_ids ucci)
        ))
      )
  ),
  pending_approval_projects AS (
    SELECT 
      p.id, p.system_size_kwp, p.carbon_credits,
      p.client_share_percentage, p.agent_commission_percentage,
      p.agent_id, p.client_reference_id
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
          OR p.client_reference_id IN (SELECT ucci.id FROM user_company_client_ids ucci)
        ))
      )
  )
  SELECT
    COALESCE(SUM(ar.system_size_kwp) / 1000.0, 0)::numeric AS audit_ready_mwp,
    COALESCE(SUM(
      CASE (SELECT urole FROM user_filter)
        WHEN 'client' THEN ar.carbon_credits * v_carbon_price_6yr * (COALESCE(ar.client_share_percentage, 70) / 100.0)
        WHEN 'agent'  THEN ar.carbon_credits * v_carbon_price_6yr * (COALESCE(ar.agent_commission_percentage, 4) / 100.0)
        -- PLATFORM NET REVENUE: carbon_credits * price * (100 - client_share - agent_commission) / 100
        ELSE ar.carbon_credits * v_carbon_price_6yr * ((100 - COALESCE(ar.client_share_percentage, 70) - COALESCE(ar.agent_commission_percentage, 4)) / 100.0)
      END
    ), 0)::numeric AS audit_ready_revenue,
    (SELECT COUNT(*) FROM audit_review_projects)::bigint AS audit_review_requests,
    COALESCE((SELECT SUM(op.system_size_kwp) / 1000.0 FROM onboarding_projects op), 0)::numeric AS onboarding_mwp,
    COALESCE((SELECT SUM(
      CASE (SELECT urole FROM user_filter)
        WHEN 'client' THEN op.carbon_credits * v_carbon_price_6yr * (COALESCE(op.client_share_percentage, 70) / 100.0)
        WHEN 'agent'  THEN op.carbon_credits * v_carbon_price_6yr * (COALESCE(op.agent_commission_percentage, 4) / 100.0)
        -- PLATFORM NET REVENUE: carbon_credits * price * (100 - client_share - agent_commission) / 100
        ELSE op.carbon_credits * v_carbon_price_6yr * ((100 - COALESCE(op.client_share_percentage, 70) - COALESCE(op.agent_commission_percentage, 4)) / 100.0)
      END
    ) FROM onboarding_projects op), 0)::numeric AS onboarding_revenue,
    COALESCE((SELECT SUM(pp.system_size_kwp) / 1000.0 FROM pending_approval_projects pp), 0)::numeric AS pending_approval_mwp,
    COALESCE((SELECT SUM(
      CASE (SELECT urole FROM user_filter)
        WHEN 'client' THEN pp.carbon_credits * v_carbon_price_6yr * (COALESCE(pp.client_share_percentage, 70) / 100.0)
        WHEN 'agent'  THEN pp.carbon_credits * v_carbon_price_6yr * (COALESCE(pp.agent_commission_percentage, 4) / 100.0)
        -- PLATFORM NET REVENUE: carbon_credits * price * (100 - client_share - agent_commission) / 100
        ELSE pp.carbon_credits * v_carbon_price_6yr * ((100 - COALESCE(pp.client_share_percentage, 70) - COALESCE(pp.agent_commission_percentage, 4)) / 100.0)
      END
    ) FROM pending_approval_projects pp), 0)::numeric AS pending_approval_revenue
  FROM audit_ready_projects ar;
END;
$function$;

COMMENT ON FUNCTION public.get_dashboard_metrics_by_stage IS 
'Dashboard revenue metrics with role-based calculations:
  - client: carbon_credits * 891.71 * client_share_percentage / 100
  - agent:  carbon_credits * 891.71 * agent_commission_percentage / 100
  - admin (platform net): carbon_credits * 891.71 * (100 - client_share - agent_commission) / 100
IMPORTANT: The ELSE branch must always include BOTH share deductions to show platform margin only.';
