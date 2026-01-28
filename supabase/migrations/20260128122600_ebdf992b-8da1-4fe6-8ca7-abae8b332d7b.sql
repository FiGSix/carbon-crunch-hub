-- Phase 1: Proposal Status Simplification - Migrate pending to sent/draft
-- =====================================================

-- Step 1: Migrate proposals with invitation_sent_at to 'sent' status (these were actually sent)
UPDATE proposals 
SET status = 'sent'
WHERE status = 'pending' 
  AND invitation_sent_at IS NOT NULL
  AND deleted_at IS NULL;

-- Step 2: Migrate proposals without invitation_sent_at to 'draft' status (never sent)
UPDATE proposals 
SET status = 'draft'
WHERE status = 'pending' 
  AND invitation_sent_at IS NULL
  AND deleted_at IS NULL;

-- Step 3: Drop and recreate the function to update status lists
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
  -- Check if user is admin
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
    
    -- Card 2: Portfolio (Audit Ready) - Revenue with per-proposal client share
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
    
    -- Card 3: In Onboarding - MWp
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
    
    -- Card 4: In Onboarding - Revenue with per-proposal client share
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
    -- Updated: removed 'pending' status, now uses draft/sent/delivered/opened/viewed/stale
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
    -- Updated: removed 'pending' status, now uses draft/sent/delivered/opened/viewed/stale
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
    
    -- Counts for debugging
    'audit_ready_count', COALESCE((
      SELECT COUNT(*)
      FROM proposals p
      JOIN project_onboarding po ON po.proposal_id = p.id
      WHERE p.deleted_at IS NULL
        AND p.archived_at IS NULL
        AND po.audit_ready = true
        AND (is_admin OR p.agent_id = p_user_id)
    ), 0),
    
    'onboarding_count', COALESCE((
      SELECT COUNT(*)
      FROM proposals p
      JOIN project_onboarding po ON po.proposal_id = p.id
      WHERE p.deleted_at IS NULL
        AND p.archived_at IS NULL
        AND po.audit_ready = false
        AND p.signed_at IS NOT NULL
        AND (is_admin OR p.agent_id = p_user_id)
    ), 0),
    
    'pending_count', COALESCE((
      SELECT COUNT(*)
      FROM proposals p
      WHERE p.deleted_at IS NULL
        AND p.archived_at IS NULL
        AND p.signed_at IS NULL
        AND p.status IN ('draft', 'sent', 'delivered', 'opened', 'viewed', 'stale')
        AND (is_admin OR p.agent_id = p_user_id)
    ), 0)
  ) INTO result;
  
  RETURN result;
END;
$$;