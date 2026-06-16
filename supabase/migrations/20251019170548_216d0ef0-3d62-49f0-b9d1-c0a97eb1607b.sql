-- Fix profiles exposure by adding admin-only authorization to get_agents_management_data
-- This prevents non-admin users from harvesting agent contact information

CREATE OR REPLACE FUNCTION public.get_agents_management_data(
  status_filter text DEFAULT NULL,
  search_term text DEFAULT NULL,
  limit_param integer DEFAULT 50,
  offset_param integer DEFAULT 0
)
RETURNS TABLE(
  agent_id uuid,
  agent_name text,
  agent_email text,
  company_name text,
  agent_status text,
  access_level text,
  commission_override numeric,
  last_active_at timestamp with time zone,
  total_proposals bigint,
  active_proposals bigint,
  signed_proposals bigint,
  total_commission numeric,
  join_date date,
  onboarding_completed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- SECURITY FIX: Only admins can access agent management data
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  WITH agent_stats AS (
    SELECT 
      p.agent_id,
      COUNT(*) as total_count,
      COUNT(*) FILTER (WHERE p.status IN ('pending', 'review_later')) as active_count,
      COUNT(*) FILTER (WHERE p.status = 'signed') as signed_count
    FROM public.proposals p
    WHERE p.deleted_at IS NULL AND p.archived_at IS NULL
    GROUP BY p.agent_id
  ),
  commission_stats AS (
    SELECT 
      ac.agent_id,
      SUM(ac.commission_amount) as total_commission
    FROM public.agent_commissions ac
    WHERE ac.commission_status = 'paid'
    GROUP BY ac.agent_id
  )
  SELECT 
    pr.id,
    TRIM(CONCAT(COALESCE(pr.first_name, ''), ' ', COALESCE(pr.last_name, ''))) as name,
    pr.email,
    pr.company_name,
    pr.agent_status,
    pr.access_level,
    pr.commission_override,
    pr.last_active_at,
    COALESCE(ast.total_count, 0),
    COALESCE(ast.active_count, 0),
    COALESCE(ast.signed_count, 0),
    COALESCE(cs.total_commission, 0),
    pr.join_date,
    pr.onboarding_completed
  FROM public.profiles pr
  LEFT JOIN agent_stats ast ON pr.id = ast.agent_id
  LEFT JOIN commission_stats cs ON pr.id = cs.agent_id
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = pr.id 
    AND ur.role IN ('agent', 'admin')
  )
  AND (status_filter IS NULL OR pr.agent_status = status_filter)
  AND (
    search_term IS NULL OR 
    pr.email ILIKE '%' || search_term || '%' OR
    pr.first_name ILIKE '%' || search_term || '%' OR
    pr.last_name ILIKE '%' || search_term || '%' OR
    pr.company_name ILIKE '%' || search_term || '%'
  )
  ORDER BY pr.last_active_at DESC NULLS LAST, pr.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$;