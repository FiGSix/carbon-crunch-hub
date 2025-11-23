-- Drop existing admin function to allow signature change
DROP FUNCTION IF EXISTS get_agent_clients_paginated_admin(uuid, integer, integer);

-- Optimize get_agent_clients_paginated: Pagination FIRST, then aggregates
CREATE OR REPLACE FUNCTION get_agent_clients_paginated(
  agent_id_param UUID DEFAULT NULL,
  limit_param INTEGER DEFAULT 50,
  offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  client_email TEXT,
  company_name TEXT,
  is_registered BOOLEAN,
  project_count BIGINT,
  total_mwp NUMERIC,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  effective_agent_id UUID;
BEGIN
  effective_agent_id := COALESCE(agent_id_param, auth.uid());

  RETURN QUERY
  WITH paginated_clients AS (
    -- Step 1: Get paginated client IDs first (fast - uses index)
    SELECT 
      c.id, 
      c.first_name, 
      c.last_name, 
      c.email, 
      c.company_name, 
      c.user_id, 
      c.created_at
    FROM clients c
    WHERE c.email IS NOT NULL
      AND TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) != ''
      AND c.created_by = effective_agent_id
    ORDER BY c.created_at DESC
    LIMIT limit_param
    OFFSET offset_param
  ),
  client_stats AS (
    -- Step 2: Calculate stats only for these specific clients (fast)
    SELECT 
      COALESCE(p.client_reference_id, p.client_id) as client_ref_id,
      COUNT(*) as project_count,
      SUM(COALESCE(p.system_size_kwp, 0)) as total_kwp
    FROM proposals p
    INNER JOIN paginated_clients pc ON (p.client_reference_id = pc.id OR p.client_id = pc.user_id)
    WHERE p.deleted_at IS NULL 
      AND p.archived_at IS NULL
      AND p.agent_id = effective_agent_id
    GROUP BY COALESCE(p.client_reference_id, p.client_id)
  )
  -- Step 3: Join and return
  SELECT 
    pc.id as client_id,
    TRIM(CONCAT(COALESCE(pc.first_name, ''), ' ', COALESCE(pc.last_name, ''))) as client_name,
    pc.email as client_email,
    COALESCE(pc.company_name, '') as company_name,
    CASE WHEN pc.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_registered,
    COALESCE(cs.project_count, 0)::BIGINT as project_count,
    COALESCE(cs.total_kwp / 1000.0, 0) as total_mwp,
    pc.created_at
  FROM paginated_clients pc
  LEFT JOIN client_stats cs ON pc.id = cs.client_ref_id
  ORDER BY pc.created_at DESC;
END;
$$;

-- Create optimized admin function with pagination-first approach
CREATE FUNCTION get_agent_clients_paginated_admin(
  agent_id_param UUID DEFAULT NULL,
  limit_param INTEGER DEFAULT 50,
  offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  client_email TEXT,
  company_name TEXT,
  is_registered BOOLEAN,
  project_count BIGINT,
  total_mwp NUMERIC,
  created_at TIMESTAMPTZ,
  agent_company_name TEXT,
  agent_id UUID,
  is_active BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH paginated_clients AS (
    -- Step 1: Get paginated clients first
    SELECT 
      c.id, 
      c.first_name, 
      c.last_name, 
      c.email, 
      c.company_name, 
      c.user_id, 
      c.created_at,
      c.created_by
    FROM clients c
    WHERE c.email IS NOT NULL
      AND TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) != ''
      AND (agent_id_param IS NULL OR c.created_by = agent_id_param)
    ORDER BY c.created_at DESC
    LIMIT limit_param
    OFFSET offset_param
  ),
  client_stats AS (
    -- Step 2: Calculate stats only for paginated clients
    SELECT 
      COALESCE(p.client_reference_id, p.client_id) as client_ref_id,
      p.agent_id,
      COUNT(*) as project_count,
      SUM(COALESCE(p.system_size_kwp, 0)) as total_kwp
    FROM proposals p
    INNER JOIN paginated_clients pc ON (p.client_reference_id = pc.id OR p.client_id = pc.user_id)
    WHERE p.deleted_at IS NULL 
      AND p.archived_at IS NULL
    GROUP BY COALESCE(p.client_reference_id, p.client_id), p.agent_id
  )
  -- Step 3: Join with agent profiles only for displayed rows
  SELECT 
    pc.id as client_id,
    TRIM(CONCAT(COALESCE(pc.first_name, ''), ' ', COALESCE(pc.last_name, ''))) as client_name,
    pc.email as client_email,
    COALESCE(pc.company_name, '') as company_name,
    CASE WHEN pc.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_registered,
    COALESCE(cs.project_count, 0)::BIGINT as project_count,
    COALESCE(cs.total_kwp / 1000.0, 0) as total_mwp,
    pc.created_at,
    COALESCE(prof.company_name, 'Crunch Carbon') as agent_company_name,
    cs.agent_id,
    CASE 
      WHEN pc.user_id IS NOT NULL THEN TRUE
      WHEN cs.project_count > 0 THEN TRUE
      ELSE TRUE
    END as is_active
  FROM paginated_clients pc
  LEFT JOIN client_stats cs ON pc.id = cs.client_ref_id
  LEFT JOIN profiles prof ON cs.agent_id = prof.id
  ORDER BY pc.created_at DESC;
END;
$$;

-- Optimize get_agent_clients_count: Direct count without proposals join
CREATE OR REPLACE FUNCTION get_agent_clients_count(
  agent_id_param UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  effective_agent_id UUID;
  client_count INTEGER;
BEGIN
  effective_agent_id := COALESCE(agent_id_param, auth.uid());

  -- Direct count on clients table (fast)
  SELECT COUNT(*)::INTEGER INTO client_count
  FROM clients c
  WHERE c.email IS NOT NULL
    AND TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) != ''
    AND c.created_by = effective_agent_id;

  RETURN client_count;
END;
$$;