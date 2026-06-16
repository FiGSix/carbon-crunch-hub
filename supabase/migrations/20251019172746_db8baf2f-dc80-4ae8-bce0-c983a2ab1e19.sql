-- Remove the overly permissive RLS policy
DROP POLICY IF EXISTS "Agents can search clients by email" ON public.clients;

-- Update the search_clients function to restrict access to only:
-- 1. Clients the agent created
-- 2. Clients from their proposals
-- 3. Admins see all
CREATE OR REPLACE FUNCTION public.search_clients(search_term text)
RETURNS TABLE(id uuid, name text, email text, company text, is_registered boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  
  -- Only allow agents and admins to search
  IF current_user_role NOT IN ('admin', 'agent') THEN
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
      -- Allow admins and agents to see all client profiles
      AND (
        current_user_role IN ('admin', 'agent')
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
      -- SECURITY FIX: Allow admins to see all, agents only see their own clients
      AND (
        current_user_role IN ('admin', 'agent')
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