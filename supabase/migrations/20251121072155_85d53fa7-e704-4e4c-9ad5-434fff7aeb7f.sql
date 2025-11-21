-- Update get_agents_management_data to return invitation_token field
DROP FUNCTION IF EXISTS public.get_agents_management_data(text, text, integer, integer);

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
  onboarding_completed boolean,
  portfolio_size_kwp numeric,
  is_invitation boolean,
  invitation_id uuid,
  invitation_token text,
  invitation_expires_at timestamp with time zone,
  invited_by_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      COUNT(*) FILTER (WHERE p.status = 'signed') as signed_count,
      SUM(COALESCE(p.system_size_kwp, 0)) FILTER (WHERE p.status = 'signed') as portfolio_kwp
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
  ),
  registered_agents AS (
    SELECT 
      pr.id as agent_id,
      TRIM(CONCAT(COALESCE(pr.first_name, ''), ' ', COALESCE(pr.last_name, ''))) as agent_name,
      pr.email as agent_email,
      pr.company_name,
      pr.agent_status,
      pr.access_level,
      pr.commission_override,
      pr.last_active_at,
      COALESCE(ast.total_count, 0) as total_proposals,
      COALESCE(ast.active_count, 0) as active_proposals,
      COALESCE(ast.signed_count, 0) as signed_proposals,
      COALESCE(cs.total_commission, 0) as total_commission,
      pr.join_date,
      pr.onboarding_completed,
      COALESCE(ast.portfolio_kwp, 0) as portfolio_size_kwp,
      false as is_invitation,
      NULL::uuid as invitation_id,
      NULL::text as invitation_token,
      NULL::timestamp with time zone as invitation_expires_at,
      NULL::text as invited_by_email
    FROM public.profiles pr
    LEFT JOIN agent_stats ast ON pr.id = ast.agent_id
    LEFT JOIN commission_stats cs ON pr.id = cs.agent_id
    WHERE EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = pr.id 
      AND ur.role IN ('agent', 'admin')
    )
    AND pr.deleted_at IS NULL
  ),
  invited_agents AS (
    SELECT
      ai.id as agent_id,
      TRIM(CONCAT(COALESCE(ai.first_name, ''), ' ', COALESCE(ai.last_name, ''))) as agent_name,
      ai.email as agent_email,
      ai.company_name,
      'invited' as agent_status,
      'standard' as access_level,
      NULL::numeric as commission_override,
      NULL::timestamp with time zone as last_active_at,
      0::bigint as total_proposals,
      0::bigint as active_proposals,
      0::bigint as signed_proposals,
      0::numeric as total_commission,
      NULL::date as join_date,
      false as onboarding_completed,
      0::numeric as portfolio_size_kwp,
      true as is_invitation,
      ai.id as invitation_id,
      ai.invitation_token as invitation_token,
      ai.expires_at as invitation_expires_at,
      (SELECT p.email FROM public.profiles p WHERE p.id = ai.invited_by) as invited_by_email
    FROM public.agent_invitations ai
    WHERE ai.status = 'pending'
    AND ai.expires_at > now()
  )
  SELECT * FROM (
    SELECT * FROM registered_agents
    UNION ALL
    SELECT * FROM invited_agents
  ) combined
  WHERE (status_filter IS NULL OR combined.agent_status = status_filter)
  AND (
    search_term IS NULL OR 
    combined.agent_email ILIKE '%' || search_term || '%' OR
    combined.agent_name ILIKE '%' || search_term || '%' OR
    combined.company_name ILIKE '%' || search_term || '%'
  )
  ORDER BY 
    CASE WHEN combined.agent_status = 'pending_approval' THEN 0 ELSE 1 END,
    CASE WHEN combined.agent_status = 'invited' THEN 0 ELSE 1 END,
    combined.last_active_at DESC NULLS LAST, 
    combined.agent_name ASC
  LIMIT limit_param
  OFFSET offset_param;
END;
$function$;