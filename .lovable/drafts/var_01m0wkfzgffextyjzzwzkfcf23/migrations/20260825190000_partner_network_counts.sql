-- Partner-network counts, Admin-only accounts excluded.
--
-- Approved Partner        : profiles.agent_status = 'active', deleted_at IS NULL,
--                           and the user holds role 'agent' or 'super_partner'.
--                           A user whose only role is 'admin' is never counted.
-- Awaiting Approval       : same role rule, agent_status = 'pending_approval'.
-- Invited, Not Registered : agent_invitations with status 'pending' and not expired,
--                           where no profile exists for that email yet.
-- Commercially Active     : an Approved Partner with at least one qualifying
--                           commercial/project-progression event in the rolling 30 days:
--                             * proposal created            (proposals.created_at)
--                             * proposal sent               (proposals.invitation_sent_at)
--                             * agreement signed            (proposals.signed_at)
--                             * onboarding progression      (onboarding_activity_log.actor_id)
--                           Logins, page views, email opens and profile edits are excluded.

CREATE OR REPLACE FUNCTION public.get_partner_network_counts()
RETURNS TABLE(
  approved bigint,
  awaiting_approval bigint,
  invited_not_registered bigint,
  total bigint,
  commercially_active_30d bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  WITH partners AS (
    SELECT pr.id, pr.agent_status
    FROM public.profiles pr
    WHERE pr.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = pr.id
          AND ur.role IN ('agent', 'super_partner')
      )
  ),
  invited AS (
    SELECT COUNT(*)::bigint AS c
    FROM public.agent_invitations ai
    WHERE ai.status = 'pending'
      AND ai.expires_at > now()
      AND NOT EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE LOWER(pr.email) = LOWER(ai.email)
          AND pr.deleted_at IS NULL
      )
  ),
  active_partners AS (
    SELECT p.id FROM partners p WHERE p.agent_status = 'active'
  ),
  commercially_active AS (
    SELECT COUNT(*)::bigint AS c
    FROM active_partners ap
    WHERE EXISTS (
        SELECT 1 FROM public.proposals pp
        WHERE pp.agent_id = ap.id
          AND pp.deleted_at IS NULL
          AND (
            pp.created_at > now() - interval '30 days'
            OR pp.invitation_sent_at > now() - interval '30 days'
            OR pp.signed_at > now() - interval '30 days'
          )
      )
      OR EXISTS (
        SELECT 1 FROM public.onboarding_activity_log oal
        WHERE oal.actor_id = ap.id
          AND oal.created_at > now() - interval '30 days'
      )
  )
  SELECT
    COUNT(*) FILTER (WHERE p.agent_status = 'active')::bigint,
    COUNT(*) FILTER (WHERE p.agent_status = 'pending_approval')::bigint,
    (SELECT c FROM invited),
    (COUNT(*) + (SELECT c FROM invited))::bigint,
    (SELECT c FROM commercially_active)
  FROM partners p;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_partner_network_counts() TO authenticated;
