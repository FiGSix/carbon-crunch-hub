
DROP FUNCTION IF EXISTS public.get_agent_clients_paginated_admin(uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.get_agent_clients_paginated_admin(
  agent_id_param uuid DEFAULT NULL::uuid,
  limit_param integer DEFAULT 50,
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
  is_active boolean,
  has_profile boolean,
  client_company_id uuid,
  portfolio_client_share_override numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      c.created_by,
      c.client_company_id,
      c.portfolio_client_share_override
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
    TRUE as is_active,
    (pc.user_id IS NOT NULL) as has_profile,
    pc.client_company_id,
    pc.portfolio_client_share_override
  FROM paginated_clients pc
  LEFT JOIN client_stats cs ON pc.id = cs.client_ref_id
  LEFT JOIN profiles prof ON cs.agent_id = prof.id
  ORDER BY pc.created_at DESC;
END;
$function$;

DO $$
DECLARE
  r RECORD;
  matched_company_id uuid;
BEGIN
  FOR r IN
    SELECT DISTINCT TRIM(c.company_name) AS name
    FROM public.clients c
    WHERE c.company_name IS NOT NULL
      AND TRIM(c.company_name) <> ''
      AND c.client_company_id IS NULL
  LOOP
    SELECT id INTO matched_company_id
    FROM public.client_companies
    WHERE LOWER(TRIM(company_name)) = LOWER(r.name)
    LIMIT 1;

    IF matched_company_id IS NULL THEN
      INSERT INTO public.client_companies (company_name)
      VALUES (r.name)
      RETURNING id INTO matched_company_id;
    END IF;

    UPDATE public.clients
    SET client_company_id = matched_company_id
    WHERE client_company_id IS NULL
      AND LOWER(TRIM(company_name)) = LOWER(r.name);
  END LOOP;
END $$;
