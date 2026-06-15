
-- a. Respect platform_fee_override at signing
CREATE OR REPLACE FUNCTION public.handle_proposal_signing_commissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_agent public.profiles%ROWTYPE;
  v_sp_id uuid;
  v_sp_rate numeric := 0;
  v_client_share numeric;
  v_agent_pct numeric;
  v_base_rate numeric;
  v_override numeric;
  v_final_rate numeric;
  v_total_client_revenue numeric;
  v_gross_revenue numeric := 0;
  v_agent_amount numeric := 0;
  v_sp_amount numeric := 0;
BEGIN
  IF NEW.signed_at IS NULL THEN RETURN NEW; END IF;
  IF NEW.agent_id IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO v_agent FROM public.profiles WHERE id = NEW.agent_id;
  v_sp_id := v_agent.super_partner_id;

  v_client_share := COALESCE(NEW.client_share_percentage, 0);
  v_agent_pct    := COALESCE(NEW.agent_commission_percentage, 0);
  v_total_client_revenue := COALESCE((NEW.content -> 'financials' ->> 'totalClientRevenue')::numeric, 0);

  IF v_client_share > 0 AND v_total_client_revenue > 0 THEN
    v_gross_revenue := v_total_client_revenue / (v_client_share / 100.0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.agent_commissions WHERE proposal_id = NEW.id) THEN
    v_base_rate := CASE WHEN COALESCE(NEW.agent_portfolio_kwp, 0) < 15000 THEN 4 ELSE 7 END;
    v_override  := v_agent.commission_override;
    v_final_rate := COALESCE(v_override, v_agent_pct, v_base_rate);
    v_agent_amount := v_gross_revenue * v_final_rate / 100.0;

    INSERT INTO public.agent_commissions
      (agent_id, proposal_id, base_rate, override_rate, final_rate, commission_amount, commission_status, calculated_at)
    VALUES
      (NEW.agent_id, NEW.id, v_base_rate, v_override, v_final_rate, v_agent_amount, 'pending', now());
  END IF;

  IF v_sp_id IS NOT NULL THEN
    v_sp_rate := public.get_super_partner_rate(v_sp_id);
    v_sp_amount := v_gross_revenue * v_sp_rate / 100.0;

    NEW.super_partner_id := v_sp_id;
    NEW.super_partner_commission_percentage := v_sp_rate;

    IF NOT EXISTS (
      SELECT 1 FROM public.super_partner_commissions
      WHERE proposal_id = NEW.id AND super_partner_id = v_sp_id
    ) THEN
      INSERT INTO public.super_partner_commissions
        (super_partner_id, agent_id, proposal_id, commission_rate, commission_amount, commission_status, calculated_at)
      VALUES
        (v_sp_id, NEW.agent_id, NEW.id, v_sp_rate, v_sp_amount, 'pending', now());
    END IF;
  END IF;

  -- Respect manual override of platform fee
  IF NOT COALESCE(NEW.platform_fee_override, false) THEN
    NEW.platform_fee_percentage := 100 - v_client_share - v_agent_pct - COALESCE(NEW.super_partner_commission_percentage, 0);
  END IF;

  RETURN NEW;
END;
$function$;

-- b. Extend backfill to snapshot proposals
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

  RETURN v_count;
END;
$function$;

-- c. Auto-link new agents on signup via agent_invitations.super_partner_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role TEXT;
  v_sp_id uuid;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');

  INSERT INTO public.profiles (
    id, email, role, first_name, last_name, company_name, phone,
    terms_accepted_at, agent_status
  )
  VALUES (
    NEW.id, NEW.email, user_role,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'company_name',
    NEW.raw_user_meta_data->>'phone',
    CASE WHEN NEW.raw_user_meta_data->>'terms_accepted_at' IS NOT NULL
         THEN (NEW.raw_user_meta_data->>'terms_accepted_at')::TIMESTAMP WITH TIME ZONE
         ELSE NULL END,
    CASE WHEN user_role = 'agent'
         THEN COALESCE(NEW.raw_user_meta_data->>'agent_status', 'pending_approval')
         ELSE 'active' END
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF user_role = 'client' THEN
    UPDATE clients SET user_id = NEW.id, updated_at = now()
     WHERE email = NEW.email AND user_id IS NULL;
  END IF;

  IF user_role = 'agent' THEN
    SELECT super_partner_id INTO v_sp_id
      FROM public.agent_invitations
     WHERE email = NEW.email AND super_partner_id IS NOT NULL
     ORDER BY created_at DESC
     LIMIT 1;
    IF v_sp_id IS NOT NULL THEN
      UPDATE public.profiles
         SET super_partner_id = v_sp_id,
             super_partner_commission_rate = public.get_super_partner_rate(v_sp_id)
       WHERE id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- d. request_agent_link_by_email RPC
CREATE OR REPLACE FUNCTION public.request_agent_link_by_email(p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_agent_id uuid;
  v_request_id uuid;
BEGIN
  IF NOT public.is_super_partner(v_caller) THEN
    RAISE EXCEPTION 'Only super partners can request agent links';
  END IF;
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  SELECT id INTO v_agent_id
    FROM public.profiles
   WHERE lower(email) = lower(trim(p_email)) AND role = 'agent' AND deleted_at IS NULL
   LIMIT 1;

  IF v_agent_id IS NULL THEN
    RAISE EXCEPTION 'No agent with email % was found', p_email;
  END IF;

  INSERT INTO public.super_partner_link_requests
    (super_partner_id, agent_id, request_type, status, notes)
  VALUES
    (v_caller, v_agent_id, 'link', 'pending', 'Requested via email: ' || trim(p_email))
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$function$;

-- e. get_super_partner_commission_ledger RPC
CREATE OR REPLACE FUNCTION public.get_super_partner_commission_ledger()
RETURNS TABLE(
  id uuid,
  proposal_id uuid,
  proposal_title text,
  client_name text,
  agent_name text,
  agent_email text,
  system_size_kwp numeric,
  signed_at timestamptz,
  commission_rate numeric,
  commission_amount numeric,
  commission_status text,
  calculated_at timestamptz,
  paid_at timestamptz,
  notes text
)
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
    COALESCE(c.first_name || ' ' || c.last_name, c.email, '—'),
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

-- f. recalc_super_partner_rates RPC (admin only)
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

  RETURN v_count;
END;
$function$;

-- g. Unique partial index — prevent duplicate pending requests
CREATE UNIQUE INDEX IF NOT EXISTS super_partner_link_requests_pending_uniq
  ON public.super_partner_link_requests (super_partner_id, agent_id, request_type)
  WHERE status = 'pending';

GRANT EXECUTE ON FUNCTION public.request_agent_link_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_super_partner_commission_ledger() TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalc_super_partner_rates(uuid) TO authenticated;
