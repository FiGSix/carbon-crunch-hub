CREATE OR REPLACE FUNCTION public.get_dashboard_metrics_by_stage(p_user_id uuid DEFAULT NULL::uuid, p_user_role text DEFAULT 'admin'::text)
 RETURNS TABLE(audit_ready_mwp numeric, audit_ready_revenue numeric, audit_review_requests bigint, onboarding_mwp numeric, onboarding_revenue numeric, pending_approval_mwp numeric, pending_approval_revenue numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_carbon_prices jsonb;
  v_default_set jsonb;
BEGIN
  -- Live admin-editable carbon prices (legacy single source)
  SELECT setting_value INTO v_carbon_prices
  FROM system_settings
  WHERE setting_key = 'carbon_prices';

  IF v_carbon_prices IS NULL THEN
    v_carbon_prices := '{}'::jsonb;
  END IF;

  -- Default carbon rate set (used when a client has no specific set)
  SELECT prices INTO v_default_set
  FROM carbon_rate_sets
  WHERE is_default = true
  LIMIT 1;

  RETURN QUERY
  WITH user_filter AS (
    SELECT p_user_id AS uid, p_user_role AS urole
  ),
  user_company_client_ids AS (
    SELECT c.id FROM clients c WHERE c.user_id = p_user_id
    UNION
    SELECT c.id FROM clients c
    WHERE c.client_company_id IN (
      SELECT ccm.client_company_id
      FROM client_company_members ccm
      WHERE ccm.user_id = p_user_id AND ccm.status = 'active'
    )
  ),
  base_proposals AS (
    SELECT
      p.id,
      p.system_size_kwp,
      p.carbon_credits,
      p.client_share_percentage,
      p.agent_commission_percentage,
      p.agent_id,
      p.client_reference_id,
      p.client_id,
      p.signed_at,
      p.status,
      po.audit_ready,
      po.submitted_for_review,
      po.admin_validated,
      NULLIF(p.content->'projectInfo'->>'commissionDate', '')::date AS commission_date,
      -- Per-client carbon rate set, falling back to the default set then system_settings
      COALESCE(crs.prices, v_default_set, v_carbon_prices) AS prices,
      -- Super partner commission on this proposal (0 when none)
      COALESCE((
        SELECT MAX(spc.commission_rate)
        FROM super_partner_commissions spc
        WHERE spc.proposal_id = p.id
      ), 0) AS sp_rate
    FROM proposals p
    LEFT JOIN project_onboarding po ON po.proposal_id = p.id
    LEFT JOIN clients cl ON cl.id = p.client_reference_id
    LEFT JOIN carbon_rate_sets crs ON crs.id = cl.carbon_rate_set_id
    CROSS JOIN user_filter uf
    WHERE p.archived_at IS NULL
      AND p.deleted_at IS NULL
      AND (
        uf.urole = 'admin'
        OR (uf.urole = 'agent'  AND p.agent_id = uf.uid)
        OR (uf.urole = 'client' AND (
          p.client_id = uf.uid
          OR p.client_reference_id IN (SELECT ucci.id FROM user_company_client_ids ucci)
        ))
      )
  ),
  proposal_revenue AS (
    SELECT
      bp.*,
      COALESCE((
        SELECT SUM(
          bp.carbon_credits
          * (price_kv.value)::numeric
          * CASE
              WHEN bp.commission_date IS NOT NULL
                   AND (price_kv.key)::int < EXTRACT(YEAR FROM bp.commission_date)::int
              THEN 0
              WHEN bp.commission_date IS NOT NULL
                   AND (price_kv.key)::int = EXTRACT(YEAR FROM bp.commission_date)::int
              THEN (
                (make_date((price_kv.key)::int, 12, 31) - bp.commission_date + 1)::numeric
                / (make_date((price_kv.key)::int, 12, 31)
                   - make_date((price_kv.key)::int, 1, 1) + 1)::numeric
              )
              ELSE 1
            END
          * (
              CASE (SELECT urole FROM user_filter)
                WHEN 'client' THEN COALESCE(bp.client_share_percentage, 0) / 100.0
                WHEN 'agent'  THEN COALESCE(bp.agent_commission_percentage, 0) / 100.0
                ELSE (100 - COALESCE(bp.client_share_percentage, 0)
                          - COALESCE(bp.agent_commission_percentage, 0)
                          - COALESCE(bp.sp_rate, 0)) / 100.0
              END
            )
        )
        FROM jsonb_each_text(bp.prices) AS price_kv(key, value)
        WHERE (price_kv.key) ~ '^[0-9]+$'
          AND (price_kv.key)::int BETWEEN 2025 AND 2030
      ), 0) AS revenue_2025_2030
    FROM base_proposals bp
  )
  SELECT
    COALESCE(SUM(CASE WHEN pr.signed_at IS NOT NULL AND pr.audit_ready = true
                      THEN pr.system_size_kwp END) / 1000.0, 0)::numeric,
    COALESCE(SUM(CASE WHEN pr.signed_at IS NOT NULL AND pr.audit_ready = true
                      THEN pr.revenue_2025_2030 END), 0)::numeric,

    COALESCE(SUM(CASE WHEN pr.submitted_for_review = true AND pr.admin_validated = false
                      THEN 1 ELSE 0 END), 0)::bigint,

    COALESCE(SUM(CASE WHEN pr.signed_at IS NOT NULL
                      AND (pr.audit_ready IS NULL OR pr.audit_ready = false)
                      THEN pr.system_size_kwp END) / 1000.0, 0)::numeric,
    COALESCE(SUM(CASE WHEN pr.signed_at IS NOT NULL
                      AND (pr.audit_ready IS NULL OR pr.audit_ready = false)
                      THEN pr.revenue_2025_2030 END), 0)::numeric,

    COALESCE(SUM(CASE WHEN pr.signed_at IS NULL
                      AND pr.status IN ('draft','sent','delivered','opened','viewed','stale')
                      THEN pr.system_size_kwp END) / 1000.0, 0)::numeric,
    COALESCE(SUM(CASE WHEN pr.signed_at IS NULL
                      AND pr.status IN ('draft','sent','delivered','opened','viewed','stale')
                      THEN pr.revenue_2025_2030 END), 0)::numeric
  FROM proposal_revenue pr;
END;
$function$;