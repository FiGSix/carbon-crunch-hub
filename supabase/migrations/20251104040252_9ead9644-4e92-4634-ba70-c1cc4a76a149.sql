-- Update get_dashboard_metrics_by_stage to use stored revenue data
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics_by_stage(
  user_id_param uuid, 
  user_role_param text
)
RETURNS TABLE(
  audit_ready_mwp numeric, 
  audit_ready_revenue numeric, 
  audit_review_requests integer, 
  onboarding_mwp numeric, 
  pending_approval_mwp numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH accessible_proposals AS (
    -- Filter proposals based on user role
    SELECT 
      p.id,
      p.system_size_kwp,
      p.client_share_percentage,
      p.agent_commission_percentage,
      p.status,
      p.signed_at,
      (p.content->'financials'->>'totalClientRevenue')::NUMERIC as total_client_revenue,
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
      -- Card 1: Audit Ready Projects MWp
      COALESCE(
        SUM(CASE 
          WHEN signed_at IS NOT NULL 
            AND audit_ready = true 
          THEN system_size_kwp 
          ELSE 0 
        END) / 1000.0, 
        0
      ) as audit_ready_mwp,
      
      -- Card 2: Total Revenue for Audit Ready (role-specific using stored data)
      COALESCE(
        SUM(CASE 
          WHEN signed_at IS NOT NULL 
            AND audit_ready = true 
            AND total_client_revenue IS NOT NULL
          THEN 
            CASE user_role_param
              -- Admin sees full revenue (100%)
              WHEN 'admin' THEN 
                total_client_revenue / NULLIF(client_share_percentage / 100.0, 0)
              
              -- Agent sees their commission
              WHEN 'agent' THEN 
                total_client_revenue * 
                (agent_commission_percentage / NULLIF(client_share_percentage, 0))
              
              -- Client sees their share (already stored correctly)
              WHEN 'client' THEN 
                total_client_revenue
              
              ELSE 0
            END
          ELSE 0 
        END),
        0
      ) as audit_ready_revenue,
      
      -- Card 3: Audit Review Requests
      COALESCE(
        COUNT(CASE 
          WHEN submitted_for_review = true 
            AND (admin_validated = false OR admin_validated IS NULL)
          THEN 1 
          ELSE NULL 
        END)::INTEGER,
        0
      ) as audit_review_requests,
      
      -- Card 4: Onboarding Projects MWp
      COALESCE(
        SUM(CASE 
          WHEN signed_at IS NOT NULL 
            AND (audit_ready = false OR audit_ready IS NULL)
          THEN system_size_kwp 
          ELSE 0 
        END) / 1000.0,
        0
      ) as onboarding_mwp,
      
      -- Card 5: Pending Approval MWp
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
$function$;