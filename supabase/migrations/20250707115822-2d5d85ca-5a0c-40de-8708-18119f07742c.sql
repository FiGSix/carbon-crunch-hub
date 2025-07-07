-- Phase 5: Database Query Optimization
-- Add performance indexes and optimize query patterns

-- 1. Enhanced indexing for proposal queries (building on existing indexes)
CREATE INDEX IF NOT EXISTS idx_proposals_agent_status_created_enhanced
ON proposals(agent_id, status, created_at DESC, deleted_at, archived_at)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_proposals_client_access_optimized
ON proposals(client_id, client_reference_id, status, created_at DESC)
WHERE deleted_at IS NULL;

-- 2. Add covering indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_proposals_status_search_covering
ON proposals(status, deleted_at, archived_at, review_later_until)
INCLUDE (id, title, agent_id, client_id, client_reference_id, created_at, carbon_credits);

-- 3. Optimize clients table indexing for search and pagination
CREATE INDEX IF NOT EXISTS idx_clients_search_optimized
ON clients(created_by, email, first_name, last_name, company_name)
WHERE user_id IS NOT NULL OR created_by IS NOT NULL;

-- 4. Add composite index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_proposals_dashboard_stats
ON proposals(agent_id, status, deleted_at, archived_at)
INCLUDE (carbon_credits, client_share_percentage, system_size_kwp, annual_energy);

-- 5. Optimize notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_priority
ON notifications(user_id, read, created_at DESC)
WHERE read = false;

-- 6. Create optimized proposal search function
CREATE OR REPLACE FUNCTION public.search_proposals_optimized(
  user_id_param UUID,
  user_role_param TEXT,
  search_term TEXT DEFAULT NULL,
  status_filter TEXT DEFAULT 'all',
  limit_param INTEGER DEFAULT 20,
  offset_param INTEGER DEFAULT 0
) RETURNS TABLE(
  id UUID,
  title TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  agent_id UUID,
  client_id UUID,
  client_reference_id UUID,
  carbon_credits NUMERIC,
  system_size_kwp NUMERIC,
  invitation_sent_at TIMESTAMP WITH TIME ZONE,
  invitation_viewed_at TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql SECURITY DEFINER AS $$
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
          WHEN 'agent' THEN p.agent_id = user_id_param
          WHEN 'client' THEN (p.client_id = user_id_param OR p.client_reference_id = user_id_param)
          ELSE false
        END
      )
      AND (
        status_filter = 'all' OR
        (status_filter = 'archived' AND p.archived_at IS NOT NULL) OR
        (status_filter = 'review-later' AND p.review_later_until IS NOT NULL AND p.review_later_until >= now()) OR
        (status_filter != 'archived' AND status_filter != 'review-later' AND p.status = status_filter)
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
$$;

-- 7. Create optimized dashboard stats function
CREATE OR REPLACE FUNCTION public.get_dashboard_stats_optimized(
  user_id_param UUID,
  user_role_param TEXT
) RETURNS TABLE(
  total_proposals BIGINT,
  active_proposals BIGINT,
  signed_proposals BIGINT,
  total_carbon_credits NUMERIC,
  total_revenue NUMERIC,
  portfolio_size_kwp NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
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
        WHEN 'agent' THEN p.agent_id = user_id_param
        WHEN 'client' THEN (p.client_id = user_id_param OR p.client_reference_id = user_id_param)
        ELSE false
      END
    );
END;
$$;