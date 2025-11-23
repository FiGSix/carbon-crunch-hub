-- Fix missing clients with NULL created_by by checking proposals in addition to created_by

-- Drop and recreate get_agent_clients_paginated with EXISTS subquery
DROP FUNCTION IF EXISTS public.get_agent_clients_paginated(uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.get_agent_clients_paginated(
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
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role TEXT;
  effective_agent_id UUID;
BEGIN
  current_user_role := public.get_current_user_role();
  
  IF current_user_role NOT IN ('admin', 'agent') THEN
    RETURN;
  END IF;
  
  effective_agent_id := COALESCE(agent_id_param, auth.uid());
  
  IF current_user_role = 'agent' AND effective_agent_id != auth.uid() THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH paginated_clients AS (
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
      AND (
        c.created_by = effective_agent_id OR
        EXISTS (
          SELECT 1 FROM proposals p
          WHERE (p.client_reference_id = c.id OR p.client_id = c.user_id)
            AND p.agent_id = effective_agent_id
            AND p.deleted_at IS NULL
            AND p.archived_at IS NULL
        )
      )
    ORDER BY c.created_at DESC
    LIMIT limit_param
    OFFSET offset_param
  ),
  client_stats AS (
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

-- Drop and recreate get_agent_clients_paginated_admin with EXISTS subquery
DROP FUNCTION IF EXISTS public.get_agent_clients_paginated_admin(uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.get_agent_clients_paginated_admin(
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
  created_at TIMESTAMP WITH TIME ZONE,
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
      AND (
        agent_id_param IS NULL OR
        c.created_by = agent_id_param OR
        EXISTS (
          SELECT 1 FROM proposals p
          WHERE (p.client_reference_id = c.id OR p.client_id = c.user_id)
            AND p.agent_id = agent_id_param
            AND p.deleted_at IS NULL
            AND p.archived_at IS NULL
        )
      )
    ORDER BY c.created_at DESC
    LIMIT limit_param
    OFFSET offset_param
  ),
  client_stats AS (
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

-- Drop and recreate get_agent_clients_count with EXISTS subquery
DROP FUNCTION IF EXISTS public.get_agent_clients_count(uuid);

CREATE OR REPLACE FUNCTION public.get_agent_clients_count(
  agent_id_param UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role TEXT;
  effective_agent_id UUID;
BEGIN
  current_user_role := public.get_current_user_role();
  
  IF current_user_role NOT IN ('admin', 'agent') THEN
    RETURN 0;
  END IF;
  
  effective_agent_id := COALESCE(agent_id_param, auth.uid());
  
  IF current_user_role = 'agent' AND effective_agent_id != auth.uid() THEN
    RETURN 0;
  END IF;

  RETURN (
    SELECT COUNT(*)::INTEGER 
    FROM clients c
    WHERE c.email IS NOT NULL
      AND TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) != ''
      AND (
        c.created_by = effective_agent_id OR
        EXISTS (
          SELECT 1 FROM proposals p
          WHERE (p.client_reference_id = c.id OR p.client_id = c.user_id)
            AND p.agent_id = effective_agent_id
            AND p.deleted_at IS NULL
            AND p.archived_at IS NULL
        )
      )
  );
END;
$$;