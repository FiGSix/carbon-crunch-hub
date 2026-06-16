-- Fix client visibility: Include prospective clients (contacts) without proposals

-- 1. Fix get_agent_clients_paginated to show clients created by agent even without proposals
CREATE OR REPLACE FUNCTION public.get_agent_clients_paginated(
  agent_id_param uuid DEFAULT NULL,
  limit_param integer DEFAULT 20,
  offset_param integer DEFAULT 0
)
RETURNS TABLE(
  client_id uuid,
  client_name text,
  client_email text,
  company_name text,
  is_registered boolean,
  project_count bigint,
  total_mwp numeric,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result_ids UUID[];
  result_count INTEGER;
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS temp_client_results (
    client_id UUID,
    client_name TEXT,
    client_email TEXT,
    company_name TEXT,
    is_registered BOOLEAN,
    project_count BIGINT,
    total_mwp NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE
  ) ON COMMIT DROP;

  INSERT INTO temp_client_results
  WITH client_proposals AS (
    SELECT 
      COALESCE(p.client_reference_id, p.client_id) as client_ref_id,
      COUNT(*) as project_count,
      SUM(COALESCE(p.system_size_kwp, p.annual_energy / 1000.0, 0)) as total_kwp
    FROM proposals p
    WHERE p.deleted_at IS NULL
      AND p.archived_at IS NULL
      AND (agent_id_param IS NULL OR p.agent_id = agent_id_param)
      AND COALESCE(p.client_reference_id, p.client_id) IS NOT NULL
    GROUP BY COALESCE(p.client_reference_id, p.client_id)
  )
  SELECT 
    c.id as client_id,
    TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) as client_name,
    c.email as client_email,
    COALESCE(c.company_name, '') as company_name,
    CASE WHEN c.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_registered,
    COALESCE(cp.project_count, 0) as project_count,
    COALESCE(cp.total_kwp / 1000.0, 0) as total_mwp,
    c.created_at
  FROM clients c
  LEFT JOIN client_proposals cp ON c.id = cp.client_ref_id
  WHERE c.email IS NOT NULL
    AND TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) != ''
    AND (
      agent_id_param IS NULL 
      OR cp.client_ref_id IS NOT NULL  -- Has proposals from this agent
      OR c.created_by = agent_id_param  -- Created by this agent (prospective clients)
    )
  ORDER BY client_name
  LIMIT limit_param
  OFFSET offset_param;

  SELECT ARRAY_AGG(tcr.client_id), COUNT(*)
  INTO result_ids, result_count
  FROM temp_client_results tcr;

  PERFORM public.log_client_access(
    'view_list',
    COALESCE(result_ids, ARRAY[]::UUID[]),
    COALESCE(result_count, 0),
    NULL
  );

  RETURN QUERY
  SELECT * FROM temp_client_results;
END;
$$;

-- 2. Fix get_agent_clients_paginated_admin similarly
CREATE OR REPLACE FUNCTION public.get_agent_clients_paginated_admin(
  agent_id_param uuid DEFAULT NULL,
  limit_param integer DEFAULT 20,
  offset_param integer DEFAULT 0
)
RETURNS TABLE(
  client_id uuid,
  client_name text,
  client_email text,
  company_name text,
  is_registered boolean,
  project_count bigint,
  total_mwp numeric,
  created_at timestamp with time zone,
  agent_company_name text,
  agent_id uuid,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result_ids UUID[];
  result_count INTEGER;
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS temp_admin_client_results (
    client_id UUID,
    client_name TEXT,
    client_email TEXT,
    company_name TEXT,
    is_registered BOOLEAN,
    project_count BIGINT,
    total_mwp NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE,
    agent_company_name TEXT,
    agent_id UUID,
    is_active BOOLEAN
  ) ON COMMIT DROP;

  INSERT INTO temp_admin_client_results
  WITH client_proposals AS (
    SELECT 
      COALESCE(p.client_reference_id, p.client_id) as client_ref_id,
      p.agent_id,
      COUNT(*) as project_count,
      SUM(COALESCE(p.system_size_kwp, p.annual_energy / 1000.0, 0)) as total_kwp
    FROM proposals p
    WHERE p.deleted_at IS NULL
      AND p.archived_at IS NULL
      AND (agent_id_param IS NULL OR p.agent_id = agent_id_param)
      AND COALESCE(p.client_reference_id, p.client_id) IS NOT NULL
    GROUP BY COALESCE(p.client_reference_id, p.client_id), p.agent_id
  )
  SELECT 
    c.id as client_id,
    TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) as client_name,
    c.email as client_email,
    COALESCE(c.company_name, '') as company_name,
    CASE WHEN c.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_registered,
    COALESCE(cp.project_count, 0) as project_count,
    COALESCE(cp.total_kwp / 1000.0, 0) as total_mwp,
    c.created_at,
    COALESCE(pr.company_name, 'Crunch Carbon') as agent_company_name,
    COALESCE(cp.agent_id, c.created_by) as agent_id,
    CASE 
      WHEN c.user_id IS NOT NULL THEN TRUE  -- Registered users are active
      WHEN cp.project_count > 0 THEN TRUE   -- Has projects means active
      ELSE TRUE                              -- Prospective clients are also active
    END as is_active
  FROM clients c
  LEFT JOIN client_proposals cp ON c.id = cp.client_ref_id
  LEFT JOIN profiles pr ON pr.id = COALESCE(cp.agent_id, c.created_by)
  WHERE c.email IS NOT NULL
    AND TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) != ''
    AND (
      agent_id_param IS NULL 
      OR cp.client_ref_id IS NOT NULL  -- Has proposals from this agent
      OR c.created_by = agent_id_param  -- Created by this agent (prospective clients)
    )
  ORDER BY client_name
  LIMIT limit_param
  OFFSET offset_param;

  SELECT ARRAY_AGG(tcr.client_id), COUNT(*)
  INTO result_ids, result_count
  FROM temp_admin_client_results tcr;

  PERFORM public.log_client_access(
    'view_list',
    COALESCE(result_ids, ARRAY[]::UUID[]),
    COALESCE(result_count, 0),
    NULL
  );

  RETURN QUERY
  SELECT * FROM temp_admin_client_results;
END;
$$;

-- 3. Fix get_agent_clients_count to include prospective clients
CREATE OR REPLACE FUNCTION public.get_agent_clients_count(
  agent_id_param uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    WITH client_proposals AS (
      SELECT DISTINCT 
        COALESCE(p.client_reference_id, p.client_id) as client_ref_id
      FROM proposals p
      WHERE p.deleted_at IS NULL
        AND p.archived_at IS NULL
        AND (agent_id_param IS NULL OR p.agent_id = agent_id_param)
        AND COALESCE(p.client_reference_id, p.client_id) IS NOT NULL
    )
    SELECT COUNT(DISTINCT c.id)::INTEGER
    FROM clients c
    LEFT JOIN client_proposals cp ON c.id = cp.client_ref_id
    WHERE c.email IS NOT NULL
      AND TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) != ''
      AND (
        agent_id_param IS NULL 
        OR cp.client_ref_id IS NOT NULL  -- Has proposals from this agent
        OR c.created_by = agent_id_param  -- Created by this agent (prospective clients)
      )
  );
END;
$$;