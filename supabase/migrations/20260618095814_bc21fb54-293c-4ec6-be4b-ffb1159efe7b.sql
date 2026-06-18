CREATE OR REPLACE FUNCTION public.get_super_partner_commission_by_company()
RETURNS TABLE(company text, mwp numeric, rate numeric, amount numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_is_admin boolean := public.is_current_user_admin();
  v_rate numeric;
BEGIN
  IF NOT (v_is_admin OR public.is_super_partner(v_caller)) THEN RETURN; END IF;

  SELECT p.super_partner_commission_rate INTO v_rate
  FROM public.profiles p WHERE p.id = v_caller;

  RETURN QUERY
  SELECT
    COALESCE(NULLIF(ag.company_name, ''), '—') AS company,
    COALESCE(SUM(pr.system_size_kwp), 0) / 1000.0 AS mwp,
    COALESCE(v_rate, 0) AS rate,
    COALESCE(SUM(spc.commission_amount), 0) AS amount
  FROM public.super_partner_commissions spc
  LEFT JOIN public.proposals pr ON pr.id = spc.proposal_id
  LEFT JOIN public.profiles ag ON ag.id = spc.agent_id
  WHERE v_is_admin OR spc.super_partner_id = v_caller
  GROUP BY COALESCE(NULLIF(ag.company_name, ''), '—')
  ORDER BY company;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_super_partner_commission_by_company() TO authenticated;