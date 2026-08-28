-- 1. Central resolver ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_client_company_id(_client_company_id uuid, _user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT ccm.client_company_id
       FROM client_company_members ccm
      WHERE _user_id IS NOT NULL
        AND ccm.user_id = _user_id
        AND ccm.status = 'active'
      ORDER BY ccm.created_at
      LIMIT 1),
    _client_company_id
  );
$$;

CREATE OR REPLACE FUNCTION public.resolve_client_company_name(_client_company_id uuid, _user_id uuid, _fallback text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT cc.company_name
       FROM client_companies cc
      WHERE cc.id = public.resolve_client_company_id(_client_company_id, _user_id)),
    NULLIF(btrim(_fallback), ''),
    ''
  );
$$;

GRANT EXECUTE ON FUNCTION public.resolve_client_company_id(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_client_company_name(uuid, uuid, text) TO authenticated, service_role;

-- 2. Atomic admin link / unlink --------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_unlink_person_from_company(_person_id uuid, _is_client_record boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed integer := 0;
  n integer;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Only admins can unlink a person from a company';
  END IF;

  IF _is_client_record THEN
    UPDATE clients
       SET client_company_id = NULL, company_name = NULL, last_modified_by = auth.uid()
     WHERE id = _person_id AND (client_company_id IS NOT NULL OR company_name IS NOT NULL);
    GET DIAGNOSTICS n = ROW_COUNT; removed := removed + n;
  ELSE
    DELETE FROM company_members WHERE user_id = _person_id;
    GET DIAGNOSTICS n = ROW_COUNT; removed := removed + n;

    DELETE FROM client_company_members WHERE user_id = _person_id;
    GET DIAGNOSTICS n = ROW_COUNT; removed := removed + n;

    UPDATE clients
       SET client_company_id = NULL, company_name = NULL, last_modified_by = auth.uid()
     WHERE user_id = _person_id AND (client_company_id IS NOT NULL OR company_name IS NOT NULL);
    GET DIAGNOSTICS n = ROW_COUNT; removed := removed + n;

    UPDATE profiles SET company_name = NULL
     WHERE id = _person_id AND company_name IS NOT NULL;
    GET DIAGNOSTICS n = ROW_COUNT; removed := removed + n;
  END IF;

  IF removed = 0 THEN
    RAISE EXCEPTION 'No company link found for this person';
  END IF;

  RETURN jsonb_build_object('removed', removed);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_link_person_to_company(
  _person_id uuid,
  _company_id uuid,
  _company_kind text,
  _role text DEFAULT 'member',
  _is_client_record boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_name text;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Only admins can link a person to a company';
  END IF;

  IF _company_kind NOT IN ('agent', 'client') THEN
    RAISE EXCEPTION 'Unknown company type: %', _company_kind;
  END IF;

  IF _company_kind = 'client' THEN
    SELECT cc.company_name INTO resolved_name FROM client_companies cc WHERE cc.id = _company_id;
  ELSE
    SELECT c.company_name INTO resolved_name FROM companies c WHERE c.id = _company_id;
  END IF;

  IF resolved_name IS NULL THEN
    RAISE EXCEPTION 'Company not found';
  END IF;

  IF _is_client_record THEN
    IF _company_kind <> 'client' THEN
      RAISE EXCEPTION 'Contact-only records can only be linked to a client company';
    END IF;
    UPDATE clients
       SET client_company_id = _company_id, company_name = resolved_name, last_modified_by = auth.uid()
     WHERE id = _person_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Client record not found';
    END IF;
    RETURN jsonb_build_object('company_id', _company_id, 'company_name', resolved_name);
  END IF;

  -- Signed-up person: replace any previous link of either type
  DELETE FROM company_members WHERE user_id = _person_id;
  DELETE FROM client_company_members WHERE user_id = _person_id;

  IF _company_kind = 'client' THEN
    INSERT INTO client_company_members (user_id, client_company_id, role, status, invited_by, approved_by, approved_at)
    VALUES (
      _person_id, _company_id,
      CASE WHEN _role IN ('team_lead', 'account_admin') THEN 'account_admin' ELSE 'member' END,
      'active', auth.uid(), auth.uid(), now()
    );

    UPDATE clients
       SET client_company_id = _company_id, company_name = resolved_name, last_modified_by = auth.uid()
     WHERE user_id = _person_id;
  ELSE
    INSERT INTO company_members (user_id, company_id, role, status, invited_by, approved_by, approved_at)
    VALUES (
      _person_id, _company_id,
      CASE WHEN _role = 'team_lead' THEN 'team_lead' ELSE 'member' END,
      'active', auth.uid(), auth.uid(), now()
    );
  END IF;

  UPDATE profiles SET company_name = resolved_name WHERE id = _person_id;

  RETURN jsonb_build_object('company_id', _company_id, 'company_name', resolved_name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_unlink_person_from_company(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_link_person_to_company(uuid, uuid, text, text, boolean) TO authenticated;

-- 3. Client lists use the resolver -----------------------------------------
CREATE OR REPLACE FUNCTION public.get_agent_clients_paginated_admin(agent_id_param uuid DEFAULT NULL::uuid, limit_param integer DEFAULT 50, offset_param integer DEFAULT 0, search_param text DEFAULT NULL::text)
 RETURNS TABLE(client_id uuid, client_name text, client_email text, company_name text, is_registered boolean, project_count bigint, total_mwp numeric, created_at timestamp with time zone, agent_company_name text, agent_id uuid, is_active boolean, has_profile boolean, client_company_id uuid, portfolio_client_share_override numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        OR public.resolve_client_company_name(c.client_company_id, c.user_id, c.company_name) ILIKE search_like
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
    public.resolve_client_company_name(pc.client_company_id, pc.user_id, pc.company_name),
    (pc.user_id IS NOT NULL),
    COALESCE(cs.project_count, 0)::BIGINT,
    COALESCE(cs.total_kwp / 1000.0, 0),
    pc.created_at,
    COALESCE(prof.company_name, 'Crunch Carbon'),
    cs.agent_id,
    TRUE,
    (pc.user_id IS NOT NULL),
    public.resolve_client_company_id(pc.client_company_id, pc.user_id),
    pc.portfolio_client_share_override
  FROM paginated_clients pc
  LEFT JOIN client_stats cs ON pc.id = cs.client_ref_id
  LEFT JOIN profiles prof ON cs.agent_id = prof.id
  ORDER BY pc.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_agent_clients_paginated(agent_id_param uuid DEFAULT NULL::uuid, limit_param integer DEFAULT 50, offset_param integer DEFAULT 0, search_param text DEFAULT NULL::text)
 RETURNS TABLE(client_id uuid, client_name text, client_email text, company_name text, is_registered boolean, project_count bigint, total_mwp numeric, created_at timestamp with time zone, has_profile boolean, client_company_id uuid, portfolio_client_share_override numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        OR public.resolve_client_company_name(c.client_company_id, c.user_id, c.company_name) ILIKE search_like
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
    public.resolve_client_company_name(pc.client_company_id, pc.user_id, pc.company_name),
    (pc.user_id IS NOT NULL),
    COALESCE(cs.project_count, 0)::BIGINT,
    COALESCE(cs.total_kwp / 1000.0, 0),
    pc.created_at,
    (pc.user_id IS NOT NULL),
    public.resolve_client_company_id(pc.client_company_id, pc.user_id),
    pc.portfolio_client_share_override
  FROM paginated_clients pc
  LEFT JOIN client_stats cs ON pc.id = cs.client_ref_id
  ORDER BY pc.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_agent_clients_optimized(agent_id_param uuid DEFAULT NULL::uuid)
 RETURNS TABLE(client_id uuid, client_name text, client_email text, company_name text, is_registered boolean, project_count bigint, total_mwp numeric, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
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
    public.resolve_client_company_name(c.client_company_id, c.user_id, c.company_name) as company_name,
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
      OR (cp.client_ref_id IS NOT NULL OR c.created_by = agent_id_param)
    )
  ORDER BY client_name;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_agent_clients(agent_id_param uuid DEFAULT NULL::uuid)
 RETURNS TABLE(client_id uuid, client_name text, client_email text, company_name text, is_registered boolean, project_count bigint, total_mwp numeric, agent_id uuid, agent_name text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH client_proposals AS (
    SELECT
      p.id as proposal_id, p.agent_id,
      COALESCE(p.client_reference_id, p.client_id) as client_ref_id,
      COALESCE(p.annual_energy, 0) as annual_energy
    FROM proposals p
    WHERE p.status != 'archived'
      AND (agent_id_param IS NULL OR p.agent_id = agent_id_param)
      AND COALESCE(p.client_reference_id, p.client_id) IS NOT NULL
  ),
  client_stats AS (
    SELECT
      cp.client_ref_id, cp.agent_id,
      COUNT(*) as project_count,
      SUM(cp.annual_energy / 1000.0) as total_mwp
    FROM client_proposals cp
    GROUP BY cp.client_ref_id, cp.agent_id
  )
  SELECT
    c.id as client_id,
    TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) as client_name,
    c.email as client_email,
    public.resolve_client_company_name(c.client_company_id, c.user_id, c.company_name) as company_name,
    CASE WHEN c.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_registered,
    COALESCE(cs.project_count, 0) as project_count,
    COALESCE(cs.total_mwp, 0) as total_mwp,
    cs.agent_id,
    TRIM(CONCAT(COALESCE(ap.first_name, ''), ' ', COALESCE(ap.last_name, ''))) as agent_name,
    c.created_at
  FROM public.clients c
  LEFT JOIN client_stats cs ON c.id = cs.client_ref_id
  LEFT JOIN public.profiles ap ON cs.agent_id = ap.id
  WHERE cs.client_ref_id IS NOT NULL
    AND c.email IS NOT NULL
    AND TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) != ''
  ORDER BY client_name;
END;
$function$;