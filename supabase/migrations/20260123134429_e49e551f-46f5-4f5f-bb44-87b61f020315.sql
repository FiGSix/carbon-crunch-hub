-- Fix client search security - restrict cross-company visibility
-- Agents can only see clients linked to their company's proposals

CREATE OR REPLACE FUNCTION public.search_clients(search_term TEXT)
RETURNS TABLE(
  id UUID,
  name TEXT,
  email TEXT,
  company TEXT,
  is_registered BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role TEXT;
  current_user_id UUID;
  result_ids UUID[];
BEGIN
  current_user_id := auth.uid();
  current_user_role := public.get_current_user_role();
  
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;
  
  IF current_user_role NOT IN ('admin', 'agent') THEN
    RETURN;
  END IF;
  
  -- Collect results into array for auditing
  SELECT ARRAY_AGG(c.id) INTO result_ids
  FROM public.clients c
  WHERE (
      c.email ILIKE '%' || search_term || '%'
      OR c.first_name ILIKE '%' || search_term || '%'
      OR c.last_name ILIKE '%' || search_term || '%'
      OR c.company_name ILIKE '%' || search_term || '%'
    )
    AND (
      current_user_role = 'admin'
      OR c.created_by = current_user_id
      OR c.id IN (
        -- Company-aware: include clients from team member proposals
        SELECT DISTINCT COALESCE(pr.client_reference_id, pr.client_id)
        FROM proposals pr
        JOIN company_members cm1 ON cm1.user_id = current_user_id AND cm1.status = 'active'
        JOIN company_members cm2 ON cm2.company_id = cm1.company_id AND cm2.status = 'active'
        WHERE pr.agent_id = cm2.user_id
          AND pr.deleted_at IS NULL
          AND COALESCE(pr.client_reference_id, pr.client_id) IS NOT NULL
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.email = c.email AND pr.role = 'client'
    );
  
  -- Log the access
  PERFORM public.log_client_access(
    'search',
    COALESCE(result_ids, ARRAY[]::UUID[]),
    COALESCE(array_length(result_ids, 1), 0),
    search_term
  );
  
  -- Return results
  RETURN QUERY
  WITH deduplicated_clients AS (
    -- Registered client profiles - RESTRICTED to company's proposals only
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
      AND (
        -- Admins see all
        current_user_role = 'admin'
        -- Agents only see profiles linked to their company's proposals
        OR (
          current_user_role = 'agent' 
          AND p.id IN (
            SELECT DISTINCT COALESCE(pr.client_id, pr.client_reference_id)
            FROM proposals pr
            JOIN company_members cm1 ON cm1.user_id = current_user_id AND cm1.status = 'active'
            JOIN company_members cm2 ON cm2.company_id = cm1.company_id AND cm2.status = 'active'
            WHERE pr.agent_id = cm2.user_id
              AND pr.deleted_at IS NULL
              AND COALESCE(pr.client_id, pr.client_reference_id) IS NOT NULL
          )
        )
      )
    
    UNION
    
    -- Client contacts - company-aware visibility
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
      AND (
        -- Admins see all
        current_user_role = 'admin'
        -- Agent created the client
        OR c.created_by = current_user_id
        -- Client is linked to a proposal from agent's company
        OR c.id IN (
          SELECT DISTINCT COALESCE(pr.client_reference_id, pr.client_id)
          FROM proposals pr
          JOIN company_members cm1 ON cm1.user_id = current_user_id AND cm1.status = 'active'
          JOIN company_members cm2 ON cm2.company_id = cm1.company_id AND cm2.status = 'active'
          WHERE pr.agent_id = cm2.user_id
            AND pr.deleted_at IS NULL
            AND COALESCE(pr.client_reference_id, pr.client_id) IS NOT NULL
        )
      )
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