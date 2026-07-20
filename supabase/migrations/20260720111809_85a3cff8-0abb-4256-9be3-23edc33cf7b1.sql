
-- Add optional search_param to client listing/count RPCs

DROP FUNCTION IF EXISTS public.get_agent_clients_paginated(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.get_agent_clients_paginated_admin(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.get_agent_clients_count(uuid);

-- Agent-scoped list
CREATE FUNCTION public.get_agent_clients_paginated(
  agent_id_param UUID DEFAULT NULL,
  limit_param INTEGER DEFAULT 50,
  offset_param INTEGER DEFAULT 0,
  search_param TEXT DEFAULT NULL
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
  has_profile BOOLEAN,
  client_company_id UUID,
  portfolio_client_share_override NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  effective_agent_id UUID;
  search_like TEXT;
BEGIN
  effective_agent_id := COALESCE(agent_id_param, auth.uid());
  search_like := CASE
    WHEN search_param IS NULL OR btrim(search_param) = '' THEN NULL
    ELSE '%' || btrim(search_param) || '%'
  END;

  RETURN QUERY
  WITH paginated_clients AS (
    SELECT
      c.id, c.first_name, c.last_name, c.email, c.company_name,
      c.user_id, c.created_at, c.client_company_id, c.portfolio_client_share_override
    FROM clients c
    WHERE c.email IS NOT NULL
      AND TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) != ''
      AND c.created_by = effective_agent_id
      AND (
        search_like IS NULL
        OR c.first_name ILIKE search_like
        OR c.last_name ILIKE search_like
        OR c.email ILIKE search_like
        OR c.company_name ILIKE search_like
        OR TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) ILIKE search_like
      )
    ORDER BY c.created_at DESC
    LIMIT limit_param
    OFFSET offset_param
  ),
  client_stats AS (
    SELECT
      COALESCE(p.client_reference_id, p.client_id) AS client_ref_id,
      COUNT(*) AS project_count,
      SUM(COALESCE(p.system_size_kwp, 0)) AS total_kwp
    FROM proposals p
    INNER JOIN paginated_clients pc ON (p.client_reference_id = pc.id OR p.client_id = pc.user_id)
    WHERE p.deleted_at IS NULL AND p.archived_at IS NULL
      AND p.agent_id = effective_agent_id
    GROUP BY COALESCE(p.client_reference_id, p.client_id)
  )
  SELECT
    pc.id,
    TRIM(CONCAT(COALESCE(pc.first_name, ''), ' ', COALESCE(pc.last_name, ''))),
    pc.email,
    COALESCE(pc.company_name, ''),
    (pc.user_id IS NOT NULL),
    COALESCE(cs.project_count, 0)::BIGINT,
    COALESCE(cs.total_kwp / 1000.0, 0),
    pc.created_at,
    (pc.user_id IS NOT NULL),
    pc.client_company_id,
    pc.portfolio_client_share_override
  FROM paginated_clients pc
  LEFT JOIN client_stats cs ON pc.id = cs.client_ref_id
  ORDER BY pc.created_at DESC;
END;
$$;

-- Admin/global list
CREATE FUNCTION public.get_agent_clients_paginated_admin(
  agent_id_param UUID DEFAULT NULL,
  limit_param INTEGER DEFAULT 50,
  offset_param INTEGER DEFAULT 0,
  search_param TEXT DEFAULT NULL
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
  is_active BOOLEAN,
  has_profile BOOLEAN,
  client_company_id UUID,
  portfolio_client_share_override NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  search_like TEXT;
BEGIN
  search_like := CASE
    WHEN search_param IS NULL OR btrim(search_param) = '' THEN NULL
    ELSE '%' || btrim(search_param) || '%'
  END;

  RETURN QUERY
  WITH paginated_clients AS (
    SELECT
      c.id, c.first_name, c.last_name, c.email, c.company_name,
      c.user_id, c.created_at, c.created_by,
      c.client_company_id, c.portfolio_client_share_override
    FROM clients c
    WHERE c.email IS NOT NULL
      AND TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) != ''
      AND (
        agent_id_param IS NULL
        OR c.created_by = agent_id_param
        OR EXISTS (
          SELECT 1 FROM proposals p
          WHERE (p.client_reference_id = c.id OR p.client_id = c.user_id)
            AND p.agent_id = agent_id_param
            AND p.deleted_at IS NULL
            AND p.archived_at IS NULL
        )
      )
      AND (
        search_like IS NULL
        OR c.first_name ILIKE search_like
        OR c.last_name ILIKE search_like
        OR c.email ILIKE search_like
        OR c.company_name ILIKE search_like
        OR TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) ILIKE search_like
      )
    ORDER BY c.created_at DESC
    LIMIT limit_param
    OFFSET offset_param
  ),
  client_stats AS (
    SELECT
      COALESCE(p.client_reference_id, p.client_id) AS client_ref_id,
      p.agent_id,
      COUNT(*) AS project_count,
      SUM(COALESCE(p.system_size_kwp, 0)) AS total_kwp
    FROM proposals p
    INNER JOIN paginated_clients pc ON (p.client_reference_id = pc.id OR p.client_id = pc.user_id)
    WHERE p.deleted_at IS NULL AND p.archived_at IS NULL
    GROUP BY COALESCE(p.client_reference_id, p.client_id), p.agent_id
  )
  SELECT
    pc.id,
    TRIM(CONCAT(COALESCE(pc.first_name, ''), ' ', COALESCE(pc.last_name, ''))),
    pc.email,
    COALESCE(pc.company_name, ''),
    (pc.user_id IS NOT NULL),
    COALESCE(cs.project_count, 0)::BIGINT,
    COALESCE(cs.total_kwp / 1000.0, 0),
    pc.created_at,
    COALESCE(prof.company_name, 'Crunch Carbon'),
    cs.agent_id,
    TRUE,
    (pc.user_id IS NOT NULL),
    pc.client_company_id,
    pc.portfolio_client_share_override
  FROM paginated_clients pc
  LEFT JOIN client_stats cs ON pc.id = cs.client_ref_id
  LEFT JOIN profiles prof ON cs.agent_id = prof.id
  ORDER BY pc.created_at DESC;
END;
$$;

-- Count (matches the search so pagination totals are correct)
CREATE FUNCTION public.get_agent_clients_count(
  agent_id_param UUID DEFAULT NULL,
  search_param TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role TEXT;
  effective_agent_id UUID;
  search_like TEXT;
BEGIN
  current_user_role := public.get_current_user_role();

  IF current_user_role NOT IN ('admin', 'agent') THEN
    RETURN 0;
  END IF;

  search_like := CASE
    WHEN search_param IS NULL OR btrim(search_param) = '' THEN NULL
    ELSE '%' || btrim(search_param) || '%'
  END;

  IF current_user_role = 'admin' THEN
    RETURN (
      SELECT COUNT(*)::INTEGER
      FROM clients c
      WHERE c.email IS NOT NULL
        AND TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) != ''
        AND (
          agent_id_param IS NULL
          OR c.created_by = agent_id_param
          OR EXISTS (
            SELECT 1 FROM proposals p
            WHERE (p.client_reference_id = c.id OR p.client_id = c.user_id)
              AND p.agent_id = agent_id_param
              AND p.deleted_at IS NULL
              AND p.archived_at IS NULL
          )
        )
        AND (
          search_like IS NULL
          OR c.first_name ILIKE search_like
          OR c.last_name ILIKE search_like
          OR c.email ILIKE search_like
          OR c.company_name ILIKE search_like
          OR TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) ILIKE search_like
        )
    );
  END IF;

  -- Agent
  effective_agent_id := COALESCE(agent_id_param, auth.uid());
  IF effective_agent_id != auth.uid() THEN
    RETURN 0;
  END IF;

  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM clients c
    WHERE c.email IS NOT NULL
      AND TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) != ''
      AND c.created_by = effective_agent_id
      AND (
        search_like IS NULL
        OR c.first_name ILIKE search_like
        OR c.last_name ILIKE search_like
        OR c.email ILIKE search_like
        OR c.company_name ILIKE search_like
        OR TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) ILIKE search_like
      )
  );
END;
$$;
