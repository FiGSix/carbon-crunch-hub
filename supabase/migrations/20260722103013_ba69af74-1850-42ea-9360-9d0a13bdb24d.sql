
-- 1) Extend get_agents_management_data with total_count via COUNT(*) OVER ()
DROP FUNCTION IF EXISTS public.get_agents_management_data(text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_agents_management_data(
  status_filter text DEFAULT NULL::text,
  search_term text DEFAULT NULL::text,
  limit_param integer DEFAULT 50,
  offset_param integer DEFAULT 0
)
RETURNS TABLE(
  agent_id uuid, agent_name text, agent_email text,
  company_name text, company_id uuid,
  company_commission_override numeric, company_signed_kwp numeric,
  agent_status text, access_level text, commission_override numeric,
  last_active_at timestamp with time zone,
  total_proposals bigint, active_proposals bigint, signed_proposals bigint,
  total_commission numeric, join_date date, onboarding_completed boolean,
  portfolio_size_kwp numeric,
  is_invitation boolean, invitation_id uuid, invitation_token text,
  invitation_expires_at timestamp with time zone, invited_by_email text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  WITH agent_stats AS (
    SELECT
      p.agent_id,
      COUNT(*) AS total_count,
      COUNT(*) FILTER (WHERE p.status IN ('pending', 'review_later')) AS active_count,
      COUNT(*) FILTER (WHERE p.status = 'signed') AS signed_count,
      SUM(COALESCE(p.system_size_kwp, 0)) FILTER (WHERE p.status = 'signed') AS portfolio_kwp
    FROM public.proposals p
    WHERE p.deleted_at IS NULL AND p.archived_at IS NULL
    GROUP BY p.agent_id
  ),
  commission_stats AS (
    SELECT ac.agent_id, SUM(ac.commission_amount) AS total_commission
    FROM public.agent_commissions ac
    WHERE ac.commission_status = 'paid'
    GROUP BY ac.agent_id
  ),
  agent_company AS (
    SELECT DISTINCT ON (cm.user_id)
      cm.user_id,
      co.id AS company_id,
      co.company_name AS company_name,
      co.commission_override AS company_commission_override
    FROM public.company_members cm
    JOIN public.companies co ON co.id = cm.company_id
    WHERE cm.status = 'active'
    ORDER BY cm.user_id, cm.created_at ASC
  ),
  solo_company AS (
    SELECT DISTINCT ON (c.created_by)
      c.created_by AS user_id,
      c.id AS company_id,
      c.company_name AS company_name,
      c.commission_override AS company_commission_override
    FROM public.companies c
    WHERE c.created_by IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM agent_company ac WHERE ac.user_id = c.created_by)
    ORDER BY c.created_by, c.created_at ASC
  ),
  sp_inherit AS (
    SELECT DISTINCT ON (LOWER(ai.email))
      LOWER(ai.email) AS email_key,
      sp.recruit_default_commission AS sp_rate
    FROM public.agent_invitations ai
    JOIN public.profiles sp ON sp.id = ai.super_partner_id
    WHERE ai.super_partner_id IS NOT NULL
      AND sp.recruit_default_commission IS NOT NULL
    ORDER BY LOWER(ai.email), ai.created_at DESC
  ),
  registered_agents AS (
    SELECT
      pr.id AS agent_id,
      TRIM(CONCAT(COALESCE(pr.first_name, ''), ' ', COALESCE(pr.last_name, ''))) AS agent_name,
      pr.email AS agent_email,
      COALESCE(ac.company_name, sc.company_name, pr.company_name, 'Private') AS company_name,
      COALESCE(ac.company_id, sc.company_id) AS company_id,
      COALESCE(ac.company_commission_override, sc.company_commission_override, spi.sp_rate) AS company_commission_override,
      COALESCE((
        SELECT SUM(COALESCE(pr2.system_size_kwp, 0))
        FROM public.proposals pr2
        WHERE pr2.company_id = COALESCE(ac.company_id, sc.company_id)
          AND pr2.signed_at IS NOT NULL
          AND pr2.deleted_at IS NULL
      ), 0) AS company_signed_kwp,
      pr.agent_status,
      pr.access_level,
      pr.commission_override,
      pr.last_active_at,
      COALESCE(ast.total_count, 0) AS total_proposals,
      COALESCE(ast.active_count, 0) AS active_proposals,
      COALESCE(ast.signed_count, 0) AS signed_proposals,
      COALESCE(cs.total_commission, 0) AS total_commission,
      pr.join_date,
      pr.onboarding_completed,
      COALESCE(ast.portfolio_kwp, 0) AS portfolio_size_kwp,
      false AS is_invitation,
      NULL::uuid AS invitation_id,
      NULL::text AS invitation_token,
      NULL::timestamp with time zone AS invitation_expires_at,
      NULL::text AS invited_by_email
    FROM public.profiles pr
    LEFT JOIN agent_stats ast ON pr.id = ast.agent_id
    LEFT JOIN commission_stats cs ON pr.id = cs.agent_id
    LEFT JOIN agent_company ac ON ac.user_id = pr.id
    LEFT JOIN solo_company sc ON sc.user_id = pr.id
    LEFT JOIN sp_inherit spi ON spi.email_key = LOWER(pr.email)
    WHERE EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = pr.id
        AND ur.role IN ('agent', 'admin')
    )
    AND pr.deleted_at IS NULL
  ),
  invited_agents AS (
    SELECT
      ai.id AS agent_id,
      TRIM(CONCAT(COALESCE(ai.first_name, ''), ' ', COALESCE(ai.last_name, ''))) AS agent_name,
      ai.email AS agent_email,
      COALESCE(ai.company_name, 'Private') AS company_name,
      NULL::uuid AS company_id,
      (SELECT sp.recruit_default_commission FROM public.profiles sp WHERE sp.id = ai.super_partner_id) AS company_commission_override,
      0::numeric AS company_signed_kwp,
      'invited' AS agent_status,
      'standard' AS access_level,
      NULL::numeric AS commission_override,
      NULL::timestamp with time zone AS last_active_at,
      0::bigint AS total_proposals,
      0::bigint AS active_proposals,
      0::bigint AS signed_proposals,
      0::numeric AS total_commission,
      NULL::date AS join_date,
      false AS onboarding_completed,
      0::numeric AS portfolio_size_kwp,
      true AS is_invitation,
      ai.id AS invitation_id,
      ai.invitation_token AS invitation_token,
      ai.expires_at AS invitation_expires_at,
      (SELECT p.email FROM public.profiles p WHERE p.id = ai.invited_by) AS invited_by_email
    FROM public.agent_invitations ai
    WHERE ai.status = 'pending'
      AND ai.expires_at > now()
  ),
  filtered AS (
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
  )
  SELECT
    f.*,
    COUNT(*) OVER () AS total_count
  FROM filtered f
  ORDER BY
    CASE WHEN f.agent_status = 'pending_approval' THEN 0 ELSE 1 END,
    CASE WHEN f.agent_status = 'invited' THEN 0 ELSE 1 END,
    f.last_active_at DESC NULLS LAST,
    f.agent_name ASC
  LIMIT limit_param
  OFFSET offset_param;
END;
$function$;

-- 2) Counts function for the glance cards
CREATE OR REPLACE FUNCTION public.get_agents_management_counts()
RETURNS TABLE(invited bigint, pending_approval bigint, active bigint, total bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  WITH invited_count AS (
    SELECT COUNT(*)::bigint AS c
    FROM public.agent_invitations ai
    WHERE ai.status = 'pending' AND ai.expires_at > now()
  ),
  registered AS (
    SELECT pr.agent_status
    FROM public.profiles pr
    WHERE pr.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = pr.id AND ur.role IN ('agent', 'admin')
      )
  )
  SELECT
    (SELECT c FROM invited_count) AS invited,
    COUNT(*) FILTER (WHERE r.agent_status = 'pending_approval')::bigint AS pending_approval,
    COUNT(*) FILTER (WHERE r.agent_status = 'active')::bigint AS active,
    ((SELECT c FROM invited_count) + COUNT(*)::bigint) AS total
  FROM registered r;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_agents_management_counts() TO authenticated;
