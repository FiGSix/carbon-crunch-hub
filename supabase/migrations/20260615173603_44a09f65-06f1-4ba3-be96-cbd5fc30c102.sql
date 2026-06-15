
-- Fix #1: ledger client name fallback to proposal snapshot (content.clientInfo)
CREATE OR REPLACE FUNCTION public.get_super_partner_commission_ledger()
 RETURNS TABLE(id uuid, proposal_id uuid, proposal_title text, client_name text, agent_name text, agent_email text, system_size_kwp numeric, signed_at timestamp with time zone, commission_rate numeric, commission_amount numeric, commission_status text, calculated_at timestamp with time zone, paid_at timestamp with time zone, notes text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_is_admin boolean := public.is_current_user_admin();
BEGIN
  IF NOT (v_is_admin OR public.is_super_partner(v_caller)) THEN RETURN; END IF;
  RETURN QUERY
  SELECT
    spc.id,
    spc.proposal_id,
    pr.title,
    COALESCE(
      NULLIF(TRIM(CONCAT(COALESCE(c.first_name,''), ' ', COALESCE(c.last_name,''))), ''),
      c.email,
      NULLIF(pr.content -> 'clientInfo' ->> 'name', ''),
      NULLIF(pr.content -> 'clientInfo' ->> 'companyName', ''),
      NULLIF(pr.content -> 'client' ->> 'name', ''),
      '—'
    ),
    TRIM(CONCAT(COALESCE(ag.first_name,''), ' ', COALESCE(ag.last_name,''))),
    ag.email,
    pr.system_size_kwp,
    pr.signed_at,
    spc.commission_rate,
    spc.commission_amount,
    spc.commission_status,
    spc.calculated_at,
    spc.paid_at,
    spc.notes
  FROM public.super_partner_commissions spc
  LEFT JOIN public.proposals pr ON pr.id = spc.proposal_id
  LEFT JOIN public.clients c ON c.id = pr.client_id
  LEFT JOIN public.profiles ag ON ag.id = spc.agent_id
  WHERE v_is_admin OR spc.super_partner_id = v_caller
  ORDER BY spc.calculated_at DESC;
END;
$function$;

-- Fix #2a: backfill should refresh the agent's snapshot AFTER linking is reflected
CREATE OR REPLACE FUNCTION public.backfill_super_partner_commissions(p_agent_id uuid, p_super_partner_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count int := 0;
  r RECORD;
  v_rate numeric;
  v_client_share numeric;
  v_agent_pct numeric;
  v_total_client_revenue numeric;
  v_gross_revenue numeric;
  v_amount numeric;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Only administrators can backfill commissions';
  END IF;

  -- Ensure the agent is linked first so get_super_partner_rate sees their kWp
  UPDATE public.profiles
     SET super_partner_id = p_super_partner_id
   WHERE id = p_agent_id
     AND (super_partner_id IS DISTINCT FROM p_super_partner_id);

  v_rate := public.get_super_partner_rate(p_super_partner_id);

  FOR r IN
    SELECT id, client_share_percentage, agent_commission_percentage, platform_fee_override, content
    FROM public.proposals
    WHERE agent_id = p_agent_id
      AND signed_at IS NOT NULL
      AND deleted_at IS NULL
  LOOP
    v_client_share := COALESCE(r.client_share_percentage, 0);
    v_agent_pct := COALESCE(r.agent_commission_percentage, 0);
    v_total_client_revenue := COALESCE((r.content -> 'financials' ->> 'totalClientRevenue')::numeric, 0);
    v_gross_revenue := CASE WHEN v_client_share > 0 AND v_total_client_revenue > 0
                            THEN v_total_client_revenue / (v_client_share / 100.0)
                            ELSE 0 END;
    v_amount := v_gross_revenue * v_rate / 100.0;

    IF NOT EXISTS (
      SELECT 1 FROM public.super_partner_commissions
      WHERE proposal_id = r.id AND super_partner_id = p_super_partner_id
    ) THEN
      INSERT INTO public.super_partner_commissions
        (super_partner_id, agent_id, proposal_id, commission_rate, commission_amount, commission_status, calculated_at, notes)
      VALUES
        (p_super_partner_id, p_agent_id, r.id, v_rate, v_amount, 'pending', now(), 'backfilled');
      v_count := v_count + 1;
    END IF;

    UPDATE public.proposals
       SET super_partner_id = p_super_partner_id,
           super_partner_commission_percentage = v_rate,
           platform_fee_percentage = CASE
             WHEN COALESCE(platform_fee_override, false) THEN platform_fee_percentage
             ELSE 100 - v_client_share - v_agent_pct - v_rate
           END
     WHERE id = r.id;
  END LOOP;

  -- Refresh agent snapshot with the rate that now includes their proposals
  UPDATE public.profiles
     SET super_partner_commission_rate = v_rate
   WHERE id = p_agent_id;

  RETURN v_count;
END;
$function$;

-- Fix #2b: admin recalc must also refresh every linked agent's snapshot
CREATE OR REPLACE FUNCTION public.recalc_super_partner_rates(p_super_partner_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rate numeric;
  v_count int := 0;
  r RECORD;
  v_client_share numeric;
  v_agent_pct numeric;
  v_total_client_revenue numeric;
  v_gross_revenue numeric;
  v_amount numeric;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Only administrators can recalculate super partner rates';
  END IF;

  v_rate := public.get_super_partner_rate(p_super_partner_id);

  FOR r IN
    SELECT spc.id AS spc_id, pr.id AS pid, pr.client_share_percentage, pr.agent_commission_percentage,
           pr.platform_fee_override, pr.content
      FROM public.super_partner_commissions spc
      JOIN public.proposals pr ON pr.id = spc.proposal_id
     WHERE spc.super_partner_id = p_super_partner_id
  LOOP
    v_client_share := COALESCE(r.client_share_percentage, 0);
    v_agent_pct := COALESCE(r.agent_commission_percentage, 0);
    v_total_client_revenue := COALESCE((r.content -> 'financials' ->> 'totalClientRevenue')::numeric, 0);
    v_gross_revenue := CASE WHEN v_client_share > 0 AND v_total_client_revenue > 0
                            THEN v_total_client_revenue / (v_client_share / 100.0)
                            ELSE 0 END;
    v_amount := v_gross_revenue * v_rate / 100.0;

    UPDATE public.super_partner_commissions
       SET commission_rate = v_rate,
           commission_amount = v_amount
     WHERE id = r.spc_id;

    UPDATE public.proposals
       SET super_partner_commission_percentage = v_rate,
           platform_fee_percentage = CASE
             WHEN COALESCE(platform_fee_override, false) THEN platform_fee_percentage
             ELSE 100 - v_client_share - v_agent_pct - v_rate
           END
     WHERE id = r.pid;

    v_count := v_count + 1;
  END LOOP;

  -- Refresh snapshot on all linked agents
  UPDATE public.profiles
     SET super_partner_commission_rate = v_rate
   WHERE super_partner_id = p_super_partner_id;

  RETURN v_count;
END;
$function$;
