-- Fix agent company visibility in RPC functions
-- Aligns RPC access control with RLS policies to allow agents 
-- to see proposals from team members in the same company

-- 1. Update search_proposals_optimized
CREATE OR REPLACE FUNCTION public.search_proposals_optimized(
  user_id_param uuid,
  user_role_param text,
  search_term text DEFAULT NULL::text,
  status_filter text DEFAULT 'all'::text,
  limit_param integer DEFAULT 20,
  offset_param integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, title text, status text, created_at timestamp with time zone,
  agent_id uuid, client_id uuid, client_reference_id uuid,
  carbon_credits numeric, system_size_kwp numeric,
  invitation_sent_at timestamp with time zone,
  invitation_viewed_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
              SELECT id FROM clients WHERE user_id = user_id_param
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
CREATE OR REPLACE FUNCTION public.get_dashboard_stats_optimized(
  user_id_param uuid,
  user_role_param text
)
RETURNS TABLE(
  total_proposals bigint, active_proposals bigint, signed_proposals bigint,
  total_carbon_credits numeric, total_revenue numeric, portfolio_size_kwp numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
            SELECT id FROM clients WHERE user_id = user_id_param
          )
        )
        ELSE false
      END
    );
END;
$function$;

-- 3. Update get_dashboard_metrics_by_stage with company membership visibility
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics_by_stage(user_id_param uuid, user_role_param text)
 RETURNS TABLE(audit_ready_mwp numeric, audit_ready_revenue numeric, audit_review_requests bigint, onboarding_mwp numeric, pending_approval_mwp numeric, pending_approval_revenue numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  RETURN QUERY
  WITH accessible_proposals AS (
    -- Filter proposals based on user role - MUST exclude deleted/archived
    SELECT 
      p.id,
      p.system_size_kwp,
      p.carbon_credits,
      p.client_share_percentage,
      p.status,
      p.signed_at,
      -- Extract commission_date from JSONB with fallbacks and NULLIF to handle empty strings
      COALESCE(
        NULLIF(p.project_info->>'commissionDate', '')::DATE,
        NULLIF(p.content->'projectInfo'->>'commissionDate', '')::DATE,
        p.signed_at::DATE,
        CURRENT_DATE
      ) as commission_date,
      po.onboarding_complete,
      po.data_access_verified,
      po.audit_ready,
      po.submitted_for_review,
      po.admin_validated
    FROM proposals p
    LEFT JOIN project_onboarding po ON po.proposal_id = p.id
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
            p.client_id = user_id_param OR 
            p.client_reference_id IN (
              SELECT id FROM clients WHERE user_id = user_id_param
            )
          )
          ELSE false
        END
      )
  ),
  metrics AS (
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
      ) as audit_ready_mwp,
      
      -- Card 2: Total Revenue for Audit Ready (calculate for years 2025-2030)
      COALESCE(
        SUM(CASE 
          WHEN signed_at IS NOT NULL 
            AND audit_ready = true 
            AND carbon_credits IS NOT NULL
            AND client_share_percentage IS NOT NULL
          THEN (
            carbon_credits * (
              (CASE 
                WHEN commission_date IS NULL OR EXTRACT(YEAR FROM commission_date) <= 2025 
                THEN 97.34 * (client_share_percentage / 100.0) *
                  (CASE 
                    WHEN commission_date IS NOT NULL AND EXTRACT(YEAR FROM commission_date) = 2025
                    THEN (365.0 - EXTRACT(DOY FROM commission_date) + 1) / 365.0
                    ELSE 1.0
                  END)
                ELSE 0 
              END) +
              (CASE 
                WHEN commission_date IS NULL OR EXTRACT(YEAR FROM commission_date) <= 2026
                THEN 127.03 * (client_share_percentage / 100.0)
                ELSE 0 
              END) +
              (CASE 
                WHEN commission_date IS NULL OR EXTRACT(YEAR FROM commission_date) <= 2027
                THEN 143.12 * (client_share_percentage / 100.0)
                ELSE 0 
              END) +
              (CASE 
                WHEN commission_date IS NULL OR EXTRACT(YEAR FROM commission_date) <= 2028
                THEN 158.79 * (client_share_percentage / 100.0)
                ELSE 0 
              END) +
              (CASE 
                WHEN commission_date IS NULL OR EXTRACT(YEAR FROM commission_date) <= 2029
                THEN 174.88 * (client_share_percentage / 100.0)
                ELSE 0 
              END) +
              (CASE 
                WHEN commission_date IS NULL OR EXTRACT(YEAR FROM commission_date) <= 2030
                THEN 190.55 * (client_share_percentage / 100.0)
                ELSE 0 
              END)
            )
          )
          ELSE 0 
        END),
        0
      ) as audit_ready_revenue,
      
      -- Card 3: Audit Review Requests (signed, submitted for review, not yet validated or audit ready)
      COALESCE(
        COUNT(CASE 
          WHEN signed_at IS NOT NULL 
            AND submitted_for_review = true
            AND (audit_ready = false OR audit_ready IS NULL)
            AND (admin_validated = false OR admin_validated IS NULL)
          THEN 1 
        END),
        0
      ) as audit_review_requests,
      
      -- Card 4: Onboarding MWp (signed but not yet onboarding_complete)
      COALESCE(
        SUM(CASE 
          WHEN signed_at IS NOT NULL 
            AND (onboarding_complete = false OR onboarding_complete IS NULL)
          THEN system_size_kwp 
          ELSE 0 
        END) / 1000.0, 
        0
      ) as onboarding_mwp,
      
      -- Card 5: Pending Approval MWp (signed, admin_validated, but not audit_ready)
      COALESCE(
        SUM(CASE 
          WHEN signed_at IS NOT NULL 
            AND admin_validated = true
            AND (audit_ready = false OR audit_ready IS NULL)
          THEN system_size_kwp 
          ELSE 0 
        END) / 1000.0, 
        0
      ) as pending_approval_mwp,
      
      -- Card 6: Pending Approval Revenue (same criteria as Card 5, with revenue calc)
      COALESCE(
        SUM(CASE 
          WHEN signed_at IS NOT NULL 
            AND admin_validated = true
            AND (audit_ready = false OR audit_ready IS NULL)
            AND carbon_credits IS NOT NULL
            AND client_share_percentage IS NOT NULL
          THEN (
            carbon_credits * (
              (CASE 
                WHEN commission_date IS NULL OR EXTRACT(YEAR FROM commission_date) <= 2025 
                THEN 97.34 * (client_share_percentage / 100.0) *
                  (CASE 
                    WHEN commission_date IS NOT NULL AND EXTRACT(YEAR FROM commission_date) = 2025
                    THEN (365.0 - EXTRACT(DOY FROM commission_date) + 1) / 365.0
                    ELSE 1.0
                  END)
                ELSE 0 
              END) +
              (CASE 
                WHEN commission_date IS NULL OR EXTRACT(YEAR FROM commission_date) <= 2026
                THEN 127.03 * (client_share_percentage / 100.0)
                ELSE 0 
              END) +
              (CASE 
                WHEN commission_date IS NULL OR EXTRACT(YEAR FROM commission_date) <= 2027
                THEN 143.12 * (client_share_percentage / 100.0)
                ELSE 0 
              END) +
              (CASE 
                WHEN commission_date IS NULL OR EXTRACT(YEAR FROM commission_date) <= 2028
                THEN 158.79 * (client_share_percentage / 100.0)
                ELSE 0 
              END) +
              (CASE 
                WHEN commission_date IS NULL OR EXTRACT(YEAR FROM commission_date) <= 2029
                THEN 174.88 * (client_share_percentage / 100.0)
                ELSE 0 
              END) +
              (CASE 
                WHEN commission_date IS NULL OR EXTRACT(YEAR FROM commission_date) <= 2030
                THEN 190.55 * (client_share_percentage / 100.0)
                ELSE 0 
              END)
            )
          )
          ELSE 0 
        END),
        0
      ) as pending_approval_revenue
    FROM accessible_proposals
  )
  SELECT 
    m.audit_ready_mwp,
    m.audit_ready_revenue,
    m.audit_review_requests,
    m.onboarding_mwp,
    m.pending_approval_mwp,
    m.pending_approval_revenue
  FROM metrics m;
END;
$function$;