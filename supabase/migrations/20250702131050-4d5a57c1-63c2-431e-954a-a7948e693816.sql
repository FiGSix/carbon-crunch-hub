-- Fix the get_agent_clients_optimized function to show all clients for admins
-- and clients with proposals for agents

CREATE OR REPLACE FUNCTION public.get_agent_clients_optimized(agent_id_param uuid DEFAULT NULL::uuid)
RETURNS TABLE(client_id uuid, client_name text, client_email text, company_name text, is_registered boolean, project_count bigint, total_mwp numeric, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  WHERE 
    c.email IS NOT NULL
    AND TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) != ''
    AND (
      -- For admin (agent_id_param is NULL), show all clients
      agent_id_param IS NULL 
      OR 
      -- For agents, show clients with proposals or clients they created
      (cp.client_ref_id IS NOT NULL OR c.created_by = agent_id_param)
    )
  ORDER BY client_name;
END;
$$;