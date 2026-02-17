
-- Fix: Add client company membership visibility to all 3 RPC functions

-- 1. Update search_proposals_optimized
CREATE OR REPLACE FUNCTION public.search_proposals_optimized(user_id_param uuid, user_role_param text, search_term text DEFAULT NULL::text, status_filter text DEFAULT 'all'::text, limit_param integer DEFAULT 20, offset_param integer DEFAULT 0)
 RETURNS TABLE(id uuid, title text, status text, created_at timestamp with time zone, agent_id uuid, client_id uuid, client_reference_id uuid, carbon_credits numeric, system_size_kwp numeric, invitation_sent_at timestamp with time zone, invitation_viewed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH filtered_proposals AS (
    SELECT 
      p.id, p.title, p.status, p.created_at, p.agent_id, 
      p.client_id, p.client_reference_id, p.carbon_credits,
      p.system_size_kwp, p.invitation_sent_at, p.invitation_viewed_at
    FROM proposals p
    WHERE p.deleted_at IS NULL
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
            p.client_id = user_id_param 
            OR p.client_reference_id IN (
              SELECT c.id FROM clients c WHERE c.user_id = user_id_param
            )
            OR p.client_reference_id IN (
              SELECT c.id FROM clients c
              WHERE c.client_company_id IN (
                SELECT ccm.client_company_id 
                FROM client_company_members ccm 
                WHERE ccm.user_id = user_id_param 
                  AND ccm.status = 'active'
              )
            )
          )
          ELSE false
        END
      )
      AND (
        status_filter = 'all' OR
        (status_filter = 'archived' AND p.archived_at IS NOT NULL) OR
        (status_filter = 'review-later' AND p.review_later_until IS NOT NULL 
         AND p.review_later_until >= now()) OR
        (status_filter != 'archived' AND status_filter != 'review-later' 
         AND p.status = status_filter)
      )
      AND (
        search_term IS NULL OR
        p.title ILIKE '%' || search_term || '%' OR
        p.content->>'clientInfo' ILIKE '%' || search_term || '%'
      )
  )
  SELECT fp.id, fp.title, fp.status, fp.created_at, fp.agent_id,
         fp.client_id, fp.client_reference_id, fp.carbon_credits,
         fp.system_size_kwp, fp.invitation_sent_at, fp.invitation_viewed_at
  FROM filtered_proposals fp
  ORDER BY fp.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$function$;

-- 2. Update get_dashboard_stats_optimized
CREATE OR REPLACE FUNCTION public.get_dashboard_stats_optimized(user_id_param uuid, user_role_param text)
 RETURNS TABLE(total_proposals bigint, active_proposals bigint, signed_proposals bigint, total_carbon_credits numeric, total_revenue numeric, portfolio_size_kwp numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE p.status IN ('pending', 'review_later')) as active_count,
    COUNT(*) FILTER (WHERE p.status = 'signed') as signed_count,
    COALESCE(SUM(p.carbon_credits), 0) as total_credits,
    COALESCE(SUM(p.carbon_credits * p.client_share_percentage / 100), 0) as revenue,
    COALESCE(SUM(p.system_size_kwp), 0) as portfolio_kwp
  FROM proposals p
  WHERE p.deleted_at IS NULL
    AND p.archived_at IS NULL
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
          p.client_id = user_id_param 
          OR p.client_reference_id IN (
            SELECT c.id FROM clients c WHERE c.user_id = user_id_param
          )
          OR p.client_reference_id IN (
            SELECT c.id FROM clients c
            WHERE c.client_company_id IN (
              SELECT ccm.client_company_id 
              FROM client_company_members ccm 
              WHERE ccm.user_id = user_id_param 
                AND ccm.status = 'active'
            )
          )
        )
        ELSE false
      END
    );
END;
$function$;

-- 3. Update get_dashboard_metrics_by_stage
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
        WHEN 'agent' THEN ar.carbon_credits * v_carbon_price_6yr * (COALESCE(ar.agent_commission_percentage, 4) / 100.0)
        ELSE ar.carbon_credits * v_carbon_price_6yr
      END
    ), 0)::numeric AS audit_ready_revenue,
    (SELECT COUNT(*) FROM audit_review_projects)::bigint AS audit_review_requests,
    COALESCE((SELECT SUM(op.system_size_kwp) / 1000.0 FROM onboarding_projects op), 0)::numeric AS onboarding_mwp,
    COALESCE((SELECT SUM(
      CASE (SELECT urole FROM user_filter)
        WHEN 'client' THEN op.carbon_credits * v_carbon_price_6yr * (COALESCE(op.client_share_percentage, 70) / 100.0)
        WHEN 'agent' THEN op.carbon_credits * v_carbon_price_6yr * (COALESCE(op.agent_commission_percentage, 4) / 100.0)
        ELSE op.carbon_credits * v_carbon_price_6yr
      END
    ) FROM onboarding_projects op), 0)::numeric AS onboarding_revenue,
    COALESCE((SELECT SUM(pp.system_size_kwp) / 1000.0 FROM pending_approval_projects pp), 0)::numeric AS pending_approval_mwp,
    COALESCE((SELECT SUM(
      CASE (SELECT urole FROM user_filter)
        WHEN 'client' THEN pp.carbon_credits * v_carbon_price_6yr * (COALESCE(pp.client_share_percentage, 70) / 100.0)
        WHEN 'agent' THEN pp.carbon_credits * v_carbon_price_6yr * (COALESCE(pp.agent_commission_percentage, 4) / 100.0)
        ELSE pp.carbon_credits * v_carbon_price_6yr
      END
    ) FROM pending_approval_projects pp), 0)::numeric AS pending_approval_revenue
  FROM audit_ready_projects ar;
END;
$function$;
