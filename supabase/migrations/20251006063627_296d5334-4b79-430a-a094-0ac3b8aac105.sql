-- Fix search_clients function to respect access control
-- Remove SECURITY DEFINER and add proper access control logic

DROP FUNCTION IF EXISTS public.search_clients(text);

CREATE OR REPLACE FUNCTION public.search_clients(search_term text)
RETURNS TABLE(
  id uuid, 
  name text, 
  email text, 
  company text, 
  is_registered boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_role TEXT;
  current_user_id UUID;
BEGIN
  -- Get current user info
  current_user_id := auth.uid();
  current_user_role := public.get_current_user_role();
  
  -- Return empty if not authenticated
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  WITH deduplicated_clients AS (
    -- Search in profiles (registered users)
    SELECT 
      p.id,
      CONCAT(p.first_name, ' ', p.last_name) as name,
      p.email,
      p.company_name as company,
      TRUE as is_registered,
      1 as priority
    FROM public.profiles p
    WHERE p.role = 'client'
      AND (
        p.email ILIKE '%' || search_term || '%'
        OR p.first_name ILIKE '%' || search_term || '%'
        OR p.last_name ILIKE '%' || search_term || '%'
        OR p.company_name ILIKE '%' || search_term || '%'
      )
      -- Only return if user has permission
      AND (
        current_user_role = 'admin' 
        OR p.id = current_user_id
      )
    
    UNION
    
    -- Search in clients table
    SELECT 
      c.id,
      CONCAT(c.first_name, ' ', c.last_name) as name,
      c.email,
      c.company_name as company,
      CASE WHEN c.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_registered,
      CASE WHEN c.user_id IS NOT NULL THEN 1 ELSE 2 END as priority
    FROM public.clients c
    WHERE (
        c.email ILIKE '%' || search_term || '%'
        OR c.first_name ILIKE '%' || search_term || '%'
        OR c.last_name ILIKE '%' || search_term || '%'
        OR c.company_name ILIKE '%' || search_term || '%'
      )
      -- Only return if user has permission (created by them, linked to them, or admin)
      AND (
        current_user_role = 'admin' 
        OR c.created_by = current_user_id 
        OR c.user_id = current_user_id
      )
      -- Don't duplicate profiles
      AND NOT EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.email = c.email AND p.role = 'client'
      )
  )
  SELECT dc.id, dc.name, dc.email, dc.company, dc.is_registered
  FROM deduplicated_clients dc
  ORDER BY dc.priority ASC, dc.name ASC;
END;
$$;

-- Fix search_clients_optimized function similarly
DROP FUNCTION IF EXISTS public.search_clients_optimized(text, uuid, integer);

CREATE OR REPLACE FUNCTION public.search_clients_optimized(
  search_term text,
  agent_id_param uuid DEFAULT NULL,
  limit_param integer DEFAULT 20
)
RETURNS TABLE(
  id uuid, 
  name text, 
  email text, 
  company text,
  is_registered boolean, 
  relevance_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_role TEXT;
  current_user_id UUID;
BEGIN
  -- Get current user info
  current_user_id := auth.uid();
  current_user_role := public.get_current_user_role();
  
  -- Return empty if not authenticated
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  WITH scored_clients AS (
    SELECT 
      c.id,
      TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) as client_name,
      c.email,
      COALESCE(c.company_name, '') as company_name,
      CASE WHEN c.user_id IS NOT NULL THEN TRUE ELSE FALSE END as registered,
      CASE 
        WHEN c.email ILIKE search_term || '%' THEN 100
        WHEN c.first_name ILIKE search_term || '%' OR c.last_name ILIKE search_term || '%' THEN 90
        WHEN c.company_name ILIKE search_term || '%' THEN 80
        WHEN c.email ILIKE '%' || search_term || '%' THEN 70
        WHEN CONCAT(c.first_name, ' ', c.last_name) ILIKE '%' || search_term || '%' THEN 60
        WHEN c.company_name ILIKE '%' || search_term || '%' THEN 50
        ELSE 10
      END as score
    FROM clients c
    WHERE (
      c.email ILIKE '%' || search_term || '%'
      OR c.first_name ILIKE '%' || search_term || '%'
      OR c.last_name ILIKE '%' || search_term || '%'
      OR c.company_name ILIKE '%' || search_term || '%'
    )
    -- Apply access control
    AND (
      current_user_role = 'admin'
      OR c.created_by = current_user_id
      OR c.user_id = current_user_id
    )
    -- Optional agent filter
    AND (agent_id_param IS NULL OR c.created_by = agent_id_param)
  )
  SELECT sc.id, sc.client_name, sc.email, sc.company_name, sc.registered, sc.score
  FROM scored_clients sc
  ORDER BY sc.score DESC, sc.client_name ASC
  LIMIT limit_param;
END;
$$;