-- Fix the get_agent_clients_paginated function to resolve GROUP BY error
CREATE OR REPLACE FUNCTION public.get_agent_clients_paginated(
  agent_id_param UUID DEFAULT NULL,
  limit_param INTEGER DEFAULT 20,
  offset_param INTEGER DEFAULT 0
)
RETURNS TABLE(
  client_id UUID,
  client_name TEXT,
  client_email TEXT,
  company_name TEXT,
  is_registered BOOLEAN,
  project_count BIGINT,
  total_mwp NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_ids UUID[];
  result_count INTEGER;
BEGIN
  -- Create a temporary table to store results
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

  -- Fetch and store results
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
  INNER JOIN client_proposals cp ON c.id = cp.client_ref_id
  WHERE c.email IS NOT NULL
    AND TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) != ''
  ORDER BY client_name
  LIMIT limit_param
  OFFSET offset_param;

  -- Get the client IDs for logging
  SELECT ARRAY_AGG(tcr.client_id), COUNT(*)
  INTO result_ids, result_count
  FROM temp_client_results tcr;

  -- Log the access
  PERFORM public.log_client_access(
    'view_list',
    COALESCE(result_ids, ARRAY[]::UUID[]),
    COALESCE(result_count, 0),
    NULL
  );

  -- Return the results
  RETURN QUERY
  SELECT * FROM temp_client_results;
END;
$$;