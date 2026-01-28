-- Fix: Restore missing audit_review_requests field to get_dashboard_metrics_by_stage
-- Root cause: Field was accidentally omitted during status simplification migration

DROP FUNCTION IF EXISTS public.get_dashboard_metrics_by_stage(uuid, text);

CREATE FUNCTION public.get_dashboard_metrics_by_stage(p_user_id uuid DEFAULT NULL, p_user_role text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  is_admin boolean;
BEGIN
  is_admin := (p_user_role = 'admin');

  SELECT jsonb_build_object(
    -- Card 1: Portfolio (Audit Ready) - MWp
    'audit_ready_mwp', COALESCE((
      SELECT SUM(p.system_size_kwp) / 1000.0
      FROM proposals p
      JOIN project_onboarding po ON po.proposal_id = p.id
      WHERE p.deleted_at IS NULL
        AND p.archived_at IS NULL
        AND po.audit_ready = true
        AND (is_admin OR p.agent_id = p_user_id)
    ), 0),
    
    -- Card 2: Portfolio (Audit Ready) - Revenue
    'audit_ready_revenue', COALESCE((
      SELECT SUM(
        (p.carbon_credits * 95 * 10) * 
        (1 - (COALESCE(p.client_share_percentage, 60) / 100.0))
      )
      FROM proposals p
      JOIN project_onboarding po ON po.proposal_id = p.id
      WHERE p.deleted_at IS NULL
        AND p.archived_at IS NULL
        AND po.audit_ready = true
        AND (is_admin OR p.agent_id = p_user_id)
    ), 0),
    
    -- Card 3: Audit Review Requests - Projects awaiting admin review (RESTORED)
    'audit_review_requests', COALESCE((
      SELECT COUNT(*)
      FROM proposals p
      JOIN project_onboarding po ON po.proposal_id = p.id
      WHERE p.deleted_at IS NULL
        AND p.archived_at IS NULL
        AND po.audit_ready = false
        AND po.submitted_for_review = true
        AND po.admin_validated = false
        AND (is_admin OR p.agent_id = p_user_id)
    ), 0),
    
    -- Card 4: In Onboarding - MWp
    'onboarding_mwp', COALESCE((
      SELECT SUM(p.system_size_kwp) / 1000.0
      FROM proposals p
      JOIN project_onboarding po ON po.proposal_id = p.id
      WHERE p.deleted_at IS NULL
        AND p.archived_at IS NULL
        AND po.audit_ready = false
        AND p.signed_at IS NOT NULL
        AND (is_admin OR p.agent_id = p_user_id)
    ), 0),
    
    -- Onboarding Revenue
    'onboarding_revenue', COALESCE((
      SELECT SUM(
        (p.carbon_credits * 95 * 10) * 
        (1 - (COALESCE(p.client_share_percentage, 60) / 100.0))
      )
      FROM proposals p
      JOIN project_onboarding po ON po.proposal_id = p.id
      WHERE p.deleted_at IS NULL
        AND p.archived_at IS NULL
        AND po.audit_ready = false
        AND p.signed_at IS NOT NULL
        AND (is_admin OR p.agent_id = p_user_id)
    ), 0),
    
    -- Card 5: Proposals Pending - MWp (unsigned proposals in pipeline)
    'pending_approval_mwp', COALESCE((
      SELECT SUM(p.system_size_kwp) / 1000.0
      FROM proposals p
      WHERE p.deleted_at IS NULL
        AND p.archived_at IS NULL
        AND p.signed_at IS NULL
        AND p.status IN ('draft', 'sent', 'delivered', 'opened', 'viewed', 'stale')
        AND (is_admin OR p.agent_id = p_user_id)
    ), 0),
    
    -- Card 6: Proposals Pending - Revenue (unsigned proposals in pipeline)
    'pending_approval_revenue', COALESCE((
      SELECT SUM(
        (p.carbon_credits * 95 * 10) * 
        (1 - (COALESCE(p.client_share_percentage, 60) / 100.0))
      )
      FROM proposals p
      WHERE p.deleted_at IS NULL
        AND p.archived_at IS NULL
        AND p.signed_at IS NULL
        AND p.status IN ('draft', 'sent', 'delivered', 'opened', 'viewed', 'stale')
        AND (is_admin OR p.agent_id = p_user_id)
    ), 0),
    
    -- Debug counts
    'audit_ready_count', COALESCE((
      SELECT COUNT(*)
      FROM proposals p
      JOIN project_onboarding po ON po.proposal_id = p.id
      WHERE p.deleted_at IS NULL AND p.archived_at IS NULL
        AND po.audit_ready = true
        AND (is_admin OR p.agent_id = p_user_id)
    ), 0),
    
    'onboarding_count', COALESCE((
      SELECT COUNT(*)
      FROM proposals p
      JOIN project_onboarding po ON po.proposal_id = p.id
      WHERE p.deleted_at IS NULL AND p.archived_at IS NULL
        AND po.audit_ready = false AND p.signed_at IS NOT NULL
        AND (is_admin OR p.agent_id = p_user_id)
    ), 0),
    
    'pending_count', COALESCE((
      SELECT COUNT(*)
      FROM proposals p
      WHERE p.deleted_at IS NULL AND p.archived_at IS NULL
        AND p.signed_at IS NULL
        AND p.status IN ('draft', 'sent', 'delivered', 'opened', 'viewed', 'stale')
        AND (is_admin OR p.agent_id = p_user_id)
    ), 0)
  ) INTO result;
  
  RETURN result;
END;
$$;