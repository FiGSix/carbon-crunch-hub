
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS super_partner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS super_partner_linked_at timestamptz,
  ADD COLUMN IF NOT EXISTS super_partner_linked_by uuid REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_companies_super_partner_id ON public.companies(super_partner_id);

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

CREATE INDEX IF NOT EXISTS idx_proposals_company_id ON public.proposals(company_id);

ALTER TABLE public.agent_invitations
  ADD COLUMN IF NOT EXISTS target_company_id uuid REFERENCES public.companies(id);

DROP POLICY IF EXISTS "Super partners view linked companies" ON public.companies;
CREATE POLICY "Super partners view linked companies"
  ON public.companies FOR SELECT
  USING (super_partner_id = auth.uid());

DROP POLICY IF EXISTS "SP view linked agent profiles" ON public.profiles;

CREATE OR REPLACE FUNCTION public.ensure_agent_has_company(p_agent_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_company_id uuid;
  v_profile public.profiles%ROWTYPE;
  v_base text;
  v_name text;
BEGIN
  IF p_agent_id IS NULL THEN RETURN NULL; END IF;

  SELECT company_id INTO v_company_id
    FROM public.company_members
   WHERE user_id = p_agent_id AND status = 'active'
   ORDER BY created_at ASC LIMIT 1;
  IF v_company_id IS NOT NULL THEN RETURN v_company_id; END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = p_agent_id;
  IF v_profile.id IS NULL THEN RAISE EXCEPTION 'Agent profile not found: %', p_agent_id; END IF;

  v_base := NULLIF(TRIM(COALESCE(v_profile.company_name, '')), '');
  IF v_base IS NULL THEN
    v_base := NULLIF(TRIM(CONCAT(COALESCE(v_profile.first_name,''),' ',COALESCE(v_profile.last_name,''))),'');
    v_base := COALESCE(v_base, v_profile.email);
  END IF;
  v_name := v_base || ' (Solo · ' || SUBSTRING(p_agent_id::text, 1, 8) || ')';

  INSERT INTO public.companies (company_name, created_by)
  VALUES (v_name, p_agent_id) RETURNING id INTO v_company_id;

  IF v_profile.role <> 'client' THEN
    INSERT INTO public.company_members
      (company_id, user_id, role, status, invited_by, approved_by, invited_at, approved_at)
    VALUES
      (v_company_id, p_agent_id, 'team_lead', 'active', p_agent_id, p_agent_id, now(), now());
  END IF;

  RETURN v_company_id;
END; $$;

REVOKE ALL ON FUNCTION public.ensure_agent_has_company(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.ensure_agent_has_company(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_super_partner_rate(p_super_partner_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  total_kwp numeric;
  threshold_mwp numeric;
  rate1 numeric;
  rate2 numeric;
BEGIN
  IF p_super_partner_id IS NULL THEN RETURN 0; END IF;

  SELECT COALESCE(SUM(pr.system_size_kwp), 0) INTO total_kwp
    FROM public.proposals pr
    JOIN public.companies c ON c.id = pr.company_id
   WHERE c.super_partner_id = p_super_partner_id
     AND pr.signed_at IS NOT NULL
     AND pr.deleted_at IS NULL;

  SELECT
    COALESCE(MAX(CASE WHEN setting_key='super_partner_mwp_tier1_threshold' THEN setting_value::numeric END), 20),
    COALESCE(MAX(CASE WHEN setting_key='super_partner_rate_tier1' THEN setting_value::numeric END), 3),
    COALESCE(MAX(CASE WHEN setting_key='super_partner_rate_tier2' THEN setting_value::numeric END), 5)
    INTO threshold_mwp, rate1, rate2
    FROM public.system_settings
   WHERE setting_key IN ('super_partner_mwp_tier1_threshold','super_partner_rate_tier1','super_partner_rate_tier2');

  IF total_kwp <= 0 THEN RETURN 0; END IF;
  IF total_kwp < threshold_mwp * 1000 THEN RETURN rate1; END IF;
  RETURN rate2;
END; $$;

CREATE OR REPLACE FUNCTION public.handle_proposal_signing_commissions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_agent public.profiles%ROWTYPE;
  v_sp_id uuid;
  v_sp_rate numeric := 0;
  v_client_share numeric;
  v_agent_pct numeric;
  v_company_kwp numeric := 0;
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

  IF NEW.company_id IS NULL THEN
    NEW.company_id := public.ensure_agent_has_company(NEW.agent_id);
  END IF;

  SELECT * INTO v_agent FROM public.profiles WHERE id = NEW.agent_id;
  SELECT super_partner_id INTO v_sp_id FROM public.companies WHERE id = NEW.company_id;

  SELECT COALESCE(SUM(system_size_kwp), 0) INTO v_company_kwp
    FROM public.proposals
   WHERE company_id = NEW.company_id
     AND signed_at IS NOT NULL
     AND deleted_at IS NULL
     AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  NEW.agent_portfolio_kwp := v_company_kwp + COALESCE(NEW.system_size_kwp, 0);

  v_client_share := COALESCE(NEW.client_share_percentage, 0);
  v_total_client_revenue := COALESCE((NEW.content -> 'financials' ->> 'totalClientRevenue')::numeric, 0);

  IF v_client_share > 0 AND v_total_client_revenue > 0 THEN
    v_gross_revenue := v_total_client_revenue / (v_client_share / 100.0);
  END IF;

  v_base_rate := CASE WHEN NEW.agent_portfolio_kwp < 15000 THEN 4 ELSE 7 END;
  v_override  := v_agent.commission_override;
  v_final_rate := COALESCE(v_override, v_base_rate);
  NEW.agent_commission_percentage := v_final_rate;
  v_agent_pct := v_final_rate;
  v_agent_amount := v_gross_revenue * v_final_rate / 100.0;

  IF NOT EXISTS (SELECT 1 FROM public.agent_commissions WHERE proposal_id = NEW.id) THEN
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
  ELSE
    NEW.super_partner_id := NULL;
    NEW.super_partner_commission_percentage := 0;
  END IF;

  IF NOT COALESCE(NEW.platform_fee_override, false) THEN
    NEW.platform_fee_percentage := 100 - v_client_share - v_agent_pct - COALESCE(NEW.super_partner_commission_percentage, 0);
  END IF;

  RETURN NEW;
END; $$;

DROP FUNCTION IF EXISTS public.backfill_super_partner_commissions(uuid, uuid);
DROP FUNCTION IF EXISTS public.backfill_super_partner_commissions(uuid);

CREATE OR REPLACE FUNCTION public.backfill_super_partner_commissions(p_super_partner_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    SELECT pr.id, pr.agent_id, pr.client_share_percentage, pr.agent_commission_percentage,
           pr.platform_fee_override, pr.content
      FROM public.proposals pr
      JOIN public.companies c ON c.id = pr.company_id
     WHERE c.super_partner_id = p_super_partner_id
       AND pr.signed_at IS NOT NULL
       AND pr.deleted_at IS NULL
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
        (p_super_partner_id, r.agent_id, r.id, v_rate, v_amount, 'pending', now(), 'backfilled');
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
END; $$;

REVOKE ALL ON FUNCTION public.backfill_super_partner_commissions(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.backfill_super_partner_commissions(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.recalc_super_partner_rates(p_super_partner_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
       SET commission_rate = v_rate, commission_amount = v_amount
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
END; $$;

DROP FUNCTION IF EXISTS public.request_agent_link_by_email(text);

CREATE OR REPLACE FUNCTION public.request_company_link(p_company_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_super_partner(auth.uid()) THEN
    RAISE EXCEPTION 'Only super partners can request company links';
  END IF;

  INSERT INTO public.super_partner_link_requests (super_partner_id, company_id, request_type, status)
  VALUES (auth.uid(), p_company_id, 'link', 'pending')
  RETURNING id INTO v_id;

  RETURN v_id;
END; $$;

REVOKE ALL ON FUNCTION public.request_company_link(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.request_company_link(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.upgrade_agent_to_super_partner(p_agent_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Only administrators can upgrade agents';
  END IF;

  PERFORM public.ensure_agent_has_company(p_agent_id);

  UPDATE public.profiles
     SET role = 'super_partner',
         super_partner_status = 'active',
         can_create_proposals = true
   WHERE id = p_agent_id AND role = 'agent';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent % not found or not in agent role', p_agent_id;
  END IF;

  DELETE FROM public.user_roles WHERE user_id = p_agent_id AND role = 'agent';
  INSERT INTO public.user_roles (user_id, role)
    VALUES (p_agent_id, 'super_partner'::app_role)
    ON CONFLICT DO NOTHING;
END; $$;

REVOKE ALL ON FUNCTION public.upgrade_agent_to_super_partner(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.upgrade_agent_to_super_partner(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_role TEXT;
  v_target_company_id uuid;
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
    UPDATE public.clients SET user_id = NEW.id, updated_at = now()
     WHERE email = NEW.email AND user_id IS NULL;
  END IF;

  IF user_role = 'agent' THEN
    SELECT target_company_id INTO v_target_company_id
      FROM public.agent_invitations
     WHERE email = NEW.email AND target_company_id IS NOT NULL
     ORDER BY created_at DESC LIMIT 1;

    IF v_target_company_id IS NOT NULL THEN
      INSERT INTO public.company_members
        (company_id, user_id, role, status, invited_by, approved_by, invited_at, approved_at)
      VALUES
        (v_target_company_id, NEW.id, 'agent', 'active', NEW.id, NEW.id, now(), now())
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END; $$;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS super_partner_id;

DELETE FROM public.super_partner_link_requests;
ALTER TABLE public.super_partner_link_requests DROP COLUMN IF EXISTS agent_id;
ALTER TABLE public.super_partner_link_requests
  ADD COLUMN company_id uuid NOT NULL REFERENCES public.companies(id);

DO $$
DECLARE r RECORD; v_cid uuid;
BEGIN
  FOR r IN
    SELECT id, agent_id, created_at FROM public.proposals
     WHERE company_id IS NULL AND agent_id IS NOT NULL
  LOOP
    SELECT company_id INTO v_cid
      FROM public.company_members
     WHERE user_id = r.agent_id AND status = 'active'
       AND created_at <= r.created_at
     ORDER BY created_at ASC LIMIT 1;
    IF v_cid IS NULL THEN
      v_cid := public.ensure_agent_has_company(r.agent_id);
    END IF;
    UPDATE public.proposals SET company_id = v_cid WHERE id = r.id;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.get_super_partner_agents();

CREATE OR REPLACE FUNCTION public.get_super_partner_companies(p_super_partner_id uuid DEFAULT NULL)
RETURNS TABLE(
  company_id uuid,
  company_name text,
  super_partner_linked_at timestamptz,
  active_member_count integer,
  total_signed_mwp numeric,
  members jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_sp_id uuid;
BEGIN
  IF public.is_current_user_admin() THEN
    v_sp_id := COALESCE(p_super_partner_id, v_caller);
  ELSIF public.is_super_partner(v_caller) THEN
    v_sp_id := v_caller;
  ELSE
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.company_name,
    c.super_partner_linked_at,
    COALESCE((
      SELECT COUNT(*)::int FROM public.company_members cm
       WHERE cm.company_id = c.id AND cm.status = 'active'
    ), 0),
    COALESCE((
      SELECT SUM(pr.system_size_kwp) / 1000.0
        FROM public.proposals pr
       WHERE pr.company_id = c.id AND pr.signed_at IS NOT NULL AND pr.deleted_at IS NULL
    ), 0),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', p.id,
        'first_name', p.first_name,
        'last_name', p.last_name,
        'email', p.email,
        'role', cm2.role,
        'status', cm2.status,
        'signed_mwp', COALESCE((
          SELECT SUM(pr2.system_size_kwp)/1000.0 FROM public.proposals pr2
           WHERE pr2.company_id = c.id AND pr2.agent_id = p.id
             AND pr2.signed_at IS NOT NULL AND pr2.deleted_at IS NULL
        ), 0),
        'proposal_count', COALESCE((
          SELECT COUNT(*) FROM public.proposals pr3
           WHERE pr3.company_id = c.id AND pr3.agent_id = p.id
             AND pr3.signed_at IS NOT NULL AND pr3.deleted_at IS NULL
        ), 0)
      ) ORDER BY p.first_name, p.last_name)
      FROM public.company_members cm2
      JOIN public.profiles p ON p.id = cm2.user_id
     WHERE cm2.company_id = c.id AND p.deleted_at IS NULL
    ), '[]'::jsonb)
  FROM public.companies c
  WHERE c.super_partner_id = v_sp_id
  ORDER BY c.super_partner_linked_at DESC NULLS LAST, c.company_name;
END; $$;

REVOKE ALL ON FUNCTION public.get_super_partner_companies(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_super_partner_companies(uuid) TO authenticated;
