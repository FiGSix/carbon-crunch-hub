-- Fix dashboard metrics function: ensure deleted proposals are excluded and add missing audit_review_requests metric

DROP FUNCTION IF EXISTS get_dashboard_metrics_by_stage(UUID, TEXT);

CREATE OR REPLACE FUNCTION get_dashboard_metrics_by_stage(
  user_id_param UUID,
  user_role_param TEXT
)
RETURNS TABLE(
  audit_ready_mwp NUMERIC,
  audit_ready_revenue NUMERIC,
  audit_review_requests BIGINT,
  onboarding_mwp NUMERIC,
  pending_approval_mwp NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
      p.commission_date,
      po.onboarding_complete,
      po.data_access_verified,
      po.audit_ready
    FROM proposals p
    LEFT JOIN project_onboarding po ON po.proposal_id = p.id
    WHERE p.deleted_at IS NULL
      AND p.archived_at IS NULL
      AND (
        CASE user_role_param
          WHEN 'admin' THEN true
          WHEN 'agent' THEN p.agent_id = user_id_param
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
                WHEN commission_date IS NULL OR EXTRACT(YEAR FROM commission_date::timestamp) <= 2025 
                THEN 97.34 * (client_share_percentage / 100.0) *
                  (CASE 
                    WHEN commission_date IS NOT NULL AND EXTRACT(YEAR FROM commission_date::timestamp) = 2025
                    THEN (365.0 - EXTRACT(DOY FROM commission_date::timestamp) + 1) / 365.0
                    ELSE 1.0
                  END)
                ELSE 0 
              END) +
              (CASE 
                WHEN commission_date IS NULL OR EXTRACT(YEAR FROM commission_date::timestamp) <= 2026
                THEN 127.03 * (client_share_percentage / 100.0)
                ELSE 0 
              END) +
              (CASE 
                WHEN commission_date IS NULL OR EXTRACT(YEAR FROM commission_date::timestamp) <= 2027
                THEN 143.12 * (client_share_percentage / 100.0)
                ELSE 0 
              END) +
              (CASE 
                WHEN commission_date IS NULL OR EXTRACT(YEAR FROM commission_date::timestamp) <= 2028
                THEN 158.79 * (client_share_percentage / 100.0)
                ELSE 0 
              END) +
              (CASE 
                WHEN commission_date IS NULL OR EXTRACT(YEAR FROM commission_date::timestamp) <= 2029
                THEN 174.88 * (client_share_percentage / 100.0)
                ELSE 0 
              END) +
              (CASE 
                WHEN commission_date IS NULL OR EXTRACT(YEAR FROM commission_date::timestamp) <= 2030
                THEN 190.55 * (client_share_percentage / 100.0)
                ELSE 0 
              END)
            )
          )
          ELSE 0 
        END),
        0
      ) as audit_ready_revenue,
      
      -- Card 3: Audit Review Requests (signed, onboarding complete, but not audit ready yet)
      COALESCE(
        COUNT(CASE 
          WHEN signed_at IS NOT NULL 
            AND onboarding_complete = true
            AND (audit_ready = false OR audit_ready IS NULL)
          THEN 1 
          ELSE NULL 
        END),
        0
      ) as audit_review_requests,
      
      -- Card 4: Onboarding Projects (signed but NOT audit_ready)
      COALESCE(
        SUM(CASE 
          WHEN signed_at IS NOT NULL 
            AND (audit_ready = false OR audit_ready IS NULL)
          THEN system_size_kwp 
          ELSE 0 
        END) / 1000.0,
        0
      ) as onboarding_mwp,
      
      -- Card 5: Pending Approval (status IN ('pending', 'draft') AND not signed)
      COALESCE(
        SUM(CASE 
          WHEN signed_at IS NULL 
            AND status IN ('pending', 'draft')
          THEN system_size_kwp 
          ELSE 0 
        END) / 1000.0,
        0
      ) as pending_approval_mwp
    FROM accessible_proposals
  )
  SELECT * FROM metrics;
END;
$$;

COMMENT ON FUNCTION get_dashboard_metrics_by_stage IS 'Calculates 5 key dashboard metrics with proper soft-delete filtering: audit ready MWp, audit ready revenue (2025-2030), audit review requests count, onboarding MWp, and pending approval MWp. Includes role-based filtering.';

GRANT EXECUTE ON FUNCTION get_dashboard_metrics_by_stage TO authenticated;