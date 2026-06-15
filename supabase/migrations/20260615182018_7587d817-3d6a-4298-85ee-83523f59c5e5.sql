-- 1) Add per-profile flag to allow Super Partners to create proposals directly
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_create_proposals boolean NOT NULL DEFAULT false;

-- 2) Rewrite get_super_partner_rate to also count the SP's own signed proposals
CREATE OR REPLACE FUNCTION public.get_super_partner_rate(p_super_partner_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  total_kwp numeric;
  threshold_mwp numeric;
  rate1 numeric;
  rate2 numeric;
BEGIN
  IF p_super_partner_id IS NULL THEN RETURN 0; END IF;

  -- Sum kWp from signed, non-deleted proposals belonging to:
  --   (a) any agent linked under this Super Partner, OR
  --   (b) the Super Partner directly (own proposals when can_create_proposals)
  SELECT COALESCE(SUM(pr.system_size_kwp), 0) INTO total_kwp
  FROM public.proposals pr
  LEFT JOIN public.profiles pf ON pf.id = pr.agent_id
  WHERE pr.deleted_at IS NULL
    AND pr.signed_at IS NOT NULL
    AND (
      pf.super_partner_id = p_super_partner_id
      OR pr.agent_id = p_super_partner_id
    );

  SELECT (setting_value #>> '{}')::numeric INTO threshold_mwp
    FROM public.system_settings WHERE setting_key = 'super_partner_mwp_tier1_threshold';
  SELECT (setting_value #>> '{}')::numeric INTO rate1
    FROM public.system_settings WHERE setting_key = 'super_partner_rate_tier1';
  SELECT (setting_value #>> '{}')::numeric INTO rate2
    FROM public.system_settings WHERE setting_key = 'super_partner_rate_tier2';

  IF total_kwp <= 0 THEN RETURN 0; END IF;
  IF (total_kwp / 1000.0) >= COALESCE(threshold_mwp, 20) THEN
    RETURN COALESCE(rate2, 5);
  END IF;
  RETURN COALESCE(rate1, 3);
END;
$function$;

-- 3) Admin-only function to upgrade an agent to Super Partner.
--    Preserves existing proposals + commissions. Nulls super_partner_id so the
--    upgraded SP's proposals are not double-counted under a previous SP.
CREATE OR REPLACE FUNCTION public.upgrade_agent_to_super_partner(p_agent_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE public.profiles
     SET role = 'super_partner',
         super_partner_status = 'active',
         can_create_proposals = true,
         super_partner_id = NULL
   WHERE id = p_agent_id
     AND role = 'agent';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile % is not an agent or does not exist', p_agent_id;
  END IF;

  -- Swap role rows; preserve any non-agent roles
  DELETE FROM public.user_roles WHERE user_id = p_agent_id AND role = 'agent';
  INSERT INTO public.user_roles (user_id, role)
       VALUES (p_agent_id, 'super_partner')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$function$;

REVOKE ALL ON FUNCTION public.upgrade_agent_to_super_partner(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.upgrade_agent_to_super_partner(uuid) TO authenticated;