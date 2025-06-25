
-- Drop the existing functions first
DROP FUNCTION IF EXISTS public.get_agent_clients(uuid);
DROP FUNCTION IF EXISTS public.get_agent_clients_optimized(uuid);

-- Recreate the get_agent_clients function with created_at timestamp
CREATE OR REPLACE FUNCTION public.get_agent_clients(agent_id_param uuid DEFAULT NULL::uuid)
RETURNS TABLE(
  client_id uuid, 
  client_name text, 
  client_email text, 
  company_name text, 
  is_registered boolean, 
  project_count bigint, 
  total_mwp numeric, 
  agent_id uuid, 
  agent_name text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  WITH client_proposals AS (
    -- Get proposals and link them to the unified clients table
    SELECT 
      p.id as proposal_id,
      p.agent_id,
      -- Try to get client from client_reference_id first, then fallback to legacy fields
      COALESCE(p.client_reference_id, p.client_id) as client_ref_id,
      COALESCE(p.annual_energy, 0) as annual_energy
    FROM proposals p
    WHERE p.status != 'archived'
      AND (agent_id_param IS NULL OR p.agent_id = agent_id_param)
      AND COALESCE(p.client_reference_id, p.client_id) IS NOT NULL
  ),
  client_stats AS (
    -- Aggregate proposal data by client
    SELECT 
      cp.client_ref_id,
      cp.agent_id,
      COUNT(*) as project_count,
      SUM(cp.annual_energy / 1000.0) as total_mwp -- Convert kWh to MWp
    FROM client_proposals cp
    GROUP BY cp.client_ref_id, cp.agent_id
  )
  SELECT 
    c.id as client_id,
    TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) as client_name,
    c.email as client_email,
    COALESCE(c.company_name, '') as company_name,
    CASE WHEN c.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_registered,
    COALESCE(cs.project_count, 0) as project_count,
    COALESCE(cs.total_mwp, 0) as total_mwp,
    cs.agent_id,
    TRIM(CONCAT(COALESCE(ap.first_name, ''), ' ', COALESCE(ap.last_name, ''))) as agent_name,
    c.created_at
  FROM public.clients c
  LEFT JOIN client_stats cs ON c.id = cs.client_ref_id
  LEFT JOIN public.profiles ap ON cs.agent_id = ap.id
  WHERE cs.client_ref_id IS NOT NULL -- Only include clients with proposals
    AND c.email IS NOT NULL
    AND TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) != ''
  ORDER BY client_name;
END;
$function$;

-- Recreate the optimized version with created_at
CREATE OR REPLACE FUNCTION public.get_agent_clients_optimized(agent_id_param uuid DEFAULT NULL::uuid)
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
SET search_path = public
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
    COALESCE(c.company_name, '') as company_name,
    CASE WHEN c.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_registered,
    COALESCE(cp.project_count, 0) as project_count,
    COALESCE(cp.total_kwp / 1000.0, 0) as total_mwp,
    c.created_at
  FROM clients c
  LEFT JOIN client_proposals cp ON c.id = cp.client_ref_id
  WHERE cp.client_ref_id IS NOT NULL
    AND c.email IS NOT NULL
    AND TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) != ''
  ORDER BY client_name;
END;
$function$;
