CREATE OR REPLACE FUNCTION public.get_super_partner_commission_by_company()
RETURNS TABLE(company text, mwp numeric, rate numeric, amount numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
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
    COALESCE(NULLIF(c.company_name, ''), '—') AS company,
    COALESCE(SUM(pr.system_size_kwp), 0) / 1000.0 AS mwp,
    COALESCE(v_rate, 0) AS rate,
    COALESCE(SUM(spc.commission_amount), 0) AS amount
  FROM public.super_partner_commissions spc
  LEFT JOIN public.proposals pr ON pr.id = spc.proposal_id
  JOIN public.company_members cm ON cm.user_id = spc.agent_id
  JOIN public.companies c ON c.id = cm.company_id
  WHERE (v_is_admin OR spc.super_partner_id = v_caller)
    AND (v_is_admin OR c.super_partner_id = v_caller)
  GROUP BY COALESCE(NULLIF(c.company_name, ''), '—')
  ORDER BY company;
END;
$$;