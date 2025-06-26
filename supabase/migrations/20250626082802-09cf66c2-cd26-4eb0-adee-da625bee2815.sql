
-- First, let's drop any existing problematic RLS policies on profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Agents can view client profiles" ON public.profiles;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_agent()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'agent');
$$;

-- Create new, safe RLS policies for profiles table
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Users can update own profile" 
ON public.profiles
FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON public.profiles  
FOR SELECT
USING (public.is_admin());

CREATE POLICY "Agents can view client profiles"
ON public.profiles
FOR SELECT  
USING (public.is_agent() AND role = 'client');

-- Now create optimized RPC functions for paginated client fetching
CREATE OR REPLACE FUNCTION public.get_agent_clients_count(agent_id_param uuid DEFAULT NULL::uuid)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
    SELECT COUNT(*)::INTEGER
    FROM clients c
    INNER JOIN client_proposals cp ON c.id = cp.client_ref_id
    WHERE c.email IS NOT NULL
      AND TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) != ''
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_agent_clients_paginated(
  agent_id_param uuid DEFAULT NULL::uuid,
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
  INNER JOIN client_proposals cp ON c.id = cp.client_ref_id
  WHERE c.email IS NOT NULL
    AND TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) != ''
  ORDER BY client_name
  LIMIT limit_param
  OFFSET offset_param;
END;
$function$;
