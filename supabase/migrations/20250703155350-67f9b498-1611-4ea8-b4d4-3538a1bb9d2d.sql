-- Phase 3: Database & Query Optimization
-- Add performance indexes for critical queries

-- Proposals table indexes for better query performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proposals_agent_status_created 
ON proposals(agent_id, status, created_at DESC) 
WHERE deleted_at IS NULL AND archived_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proposals_client_status 
ON proposals(client_id, status) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proposals_client_ref_status 
ON proposals(client_reference_id, status) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proposals_invitation_token 
ON proposals(invitation_token) 
WHERE invitation_token IS NOT NULL AND invitation_expires_at > now();

-- Clients table indexes for search and agent relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_created_by_email 
ON clients(created_by, email);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_user_id 
ON clients(user_id) 
WHERE user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_email_search 
ON clients USING gin(to_tsvector('english', 
  COALESCE(first_name, '') || ' ' || 
  COALESCE(last_name, '') || ' ' || 
  COALESCE(email, '') || ' ' || 
  COALESCE(company_name, '')
));

-- Profiles table indexes for role-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_role_email 
ON profiles(role, email);

-- Notifications table indexes for user queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read_created 
ON notifications(user_id, read, created_at DESC);

-- System settings indexes for quick lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_settings_key 
ON system_settings(setting_key);

-- Create optimized functions for common queries
CREATE OR REPLACE FUNCTION get_agent_dashboard_stats(agent_id_param UUID)
RETURNS TABLE(
  total_proposals BIGINT,
  active_proposals BIGINT,
  signed_proposals BIGINT,
  total_clients BIGINT,
  total_carbon_credits NUMERIC,
  total_revenue NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH proposal_stats AS (
    SELECT 
      COUNT(*) as total_count,
      COUNT(*) FILTER (WHERE status IN ('pending', 'review_later')) as active_count,
      COUNT(*) FILTER (WHERE status = 'signed') as signed_count,
      SUM(COALESCE(carbon_credits, 0)) as total_credits,
      SUM(COALESCE(carbon_credits * client_share_percentage / 100, 0)) as revenue
    FROM proposals 
    WHERE agent_id = agent_id_param 
      AND deleted_at IS NULL 
      AND archived_at IS NULL
  ),
  client_stats AS (
    SELECT COUNT(DISTINCT COALESCE(client_reference_id, client_id)) as unique_clients
    FROM proposals 
    WHERE agent_id = agent_id_param 
      AND deleted_at IS NULL 
      AND COALESCE(client_reference_id, client_id) IS NOT NULL
  )
  SELECT 
    ps.total_count,
    ps.active_count, 
    ps.signed_count,
    cs.unique_clients,
    ps.total_credits,
    ps.revenue
  FROM proposal_stats ps, client_stats cs;
END;
$$;

-- Optimized client search function with better performance
CREATE OR REPLACE FUNCTION search_clients_optimized(
  search_term TEXT,
  agent_id_param UUID DEFAULT NULL,
  limit_param INTEGER DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  email TEXT,
  company TEXT,
  is_registered BOOLEAN,
  relevance_score NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH scored_clients AS (
    SELECT 
      c.id,
      TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) as client_name,
      c.email,
      COALESCE(c.company_name, '') as company_name,
      CASE WHEN c.user_id IS NOT NULL THEN TRUE ELSE FALSE END as registered,
      -- Relevance scoring based on match quality
      CASE 
        WHEN c.email ILIKE search_term || '%' THEN 100
        WHEN c.first_name ILIKE search_term || '%' OR c.last_name ILIKE search_term || '%' THEN 90
        WHEN c.company_name ILIKE search_term || '%' THEN 80
        WHEN c.email ILIKE '%' || search_term || '%' THEN 70
        WHEN CONCAT(c.first_name, ' ', c.last_name) ILIKE '%' || search_term || '%' THEN 60
        WHEN c.company_name ILIKE '%' || search_term || '%' THEN 50
        ELSE 10
      END as score
    FROM clients c
    WHERE (
      c.email ILIKE '%' || search_term || '%'
      OR c.first_name ILIKE '%' || search_term || '%'
      OR c.last_name ILIKE '%' || search_term || '%'
      OR c.company_name ILIKE '%' || search_term || '%'
    )
    AND (agent_id_param IS NULL OR c.created_by = agent_id_param)
  )
  SELECT 
    sc.id,
    sc.client_name,
    sc.email,
    sc.company_name,
    sc.registered,
    sc.score
  FROM scored_clients sc
  ORDER BY sc.score DESC, sc.client_name ASC
  LIMIT limit_param;
END;
$$;