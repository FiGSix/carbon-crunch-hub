
-- 1) Extend app_role enum (literal not used at parse time within this migration)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_partner';

-- 2) profiles additions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS super_partner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS super_partner_commission_rate numeric,
  ADD COLUMN IF NOT EXISTS super_partner_status text DEFAULT 'active';

-- 3) proposals snapshot columns
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS super_partner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS super_partner_commission_percentage numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_fee_percentage numeric,
  ADD COLUMN IF NOT EXISTS platform_fee_override boolean DEFAULT false;

-- 4) agent_invitations: link column for SP-originated invites
ALTER TABLE public.agent_invitations
  ADD COLUMN IF NOT EXISTS super_partner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 5) super_partner_commissions ledger
CREATE TABLE IF NOT EXISTS public.super_partner_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  super_partner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  proposal_id uuid REFERENCES public.proposals(id) ON DELETE CASCADE,
  commission_rate numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  commission_status text DEFAULT 'pending',
  calculated_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES public.profiles(id),
  paid_at timestamptz,
  notes text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.super_partner_commissions TO authenticated;
GRANT ALL ON public.super_partner_commissions TO service_role;
ALTER TABLE public.super_partner_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage SP commissions" ON public.super_partner_commissions
  FOR ALL USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
CREATE POLICY "SP view own commissions" ON public.super_partner_commissions
  FOR SELECT USING (super_partner_id = auth.uid());

-- 6) super_partner_link_requests
CREATE TABLE IF NOT EXISTS public.super_partner_link_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  super_partner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('link','unlink')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id),
  notes text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.super_partner_link_requests TO authenticated;
GRANT ALL ON public.super_partner_link_requests TO service_role;
ALTER TABLE public.super_partner_link_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage SP link requests" ON public.super_partner_link_requests
  FOR ALL USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
CREATE POLICY "SP insert own link requests" ON public.super_partner_link_requests
  FOR INSERT WITH CHECK (super_partner_id = auth.uid());
CREATE POLICY "SP view own link requests" ON public.super_partner_link_requests
  FOR SELECT USING (super_partner_id = auth.uid());

-- 7) is_super_partner helper (avoids enum literal at parse time)
CREATE OR REPLACE FUNCTION public.is_super_partner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = 'super_partner'
  );
$$;

-- 8) profiles RLS — SP can view their linked agents' profiles
DROP POLICY IF EXISTS "SP view linked agent profiles" ON public.profiles;
CREATE POLICY "SP view linked agent profiles" ON public.profiles
  FOR SELECT USING (super_partner_id = auth.uid());

-- 9) Seed system_settings (jsonb)
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES
  ('super_partner_mwp_tier1_threshold', '20'::jsonb, 'MWp threshold at/above which super partners earn tier2 rate'),
  ('super_partner_rate_tier1',           '3'::jsonb, 'Super partner commission percent when aggregated MWp is below tier1 threshold'),
  ('super_partner_rate_tier2',           '5'::jsonb, 'Super partner commission percent when aggregated MWp meets or exceeds tier1 threshold')
ON CONFLICT (setting_key) DO NOTHING;

-- 10) get_super_partner_rate
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
  JOIN public.profiles pf ON pf.id = pr.agent_id
  WHERE pf.super_partner_id = p_super_partner_id
    AND pr.deleted_at IS NULL
    AND pr.signed_at IS NOT NULL;

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
$$;

-- 11) Signing-time commission writer (BEFORE so we can mutate NEW)
CREATE OR REPLACE FUNCTION public.handle_proposal_signing_commissions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  -- Agent commission auto-write (skip if a row already exists for this proposal)
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

  -- Super partner commission
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

  -- Platform fee snapshot (do not flip override flag on first calc)
  NEW.platform_fee_percentage := 100 - v_client_share - v_agent_pct - COALESCE(NEW.super_partner_commission_percentage, 0);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_signing_commissions_upd ON public.proposals;
CREATE TRIGGER trg_signing_commissions_upd
BEFORE UPDATE ON public.proposals
FOR EACH ROW
WHEN (OLD.signed_at IS NULL AND NEW.signed_at IS NOT NULL)
EXECUTE FUNCTION public.handle_proposal_signing_commissions();

DROP TRIGGER IF EXISTS trg_signing_commissions_ins ON public.proposals;
CREATE TRIGGER trg_signing_commissions_ins
BEFORE INSERT ON public.proposals
FOR EACH ROW
WHEN (NEW.signed_at IS NOT NULL)
EXECUTE FUNCTION public.handle_proposal_signing_commissions();

-- 12) Backfill function
CREATE OR REPLACE FUNCTION public.backfill_super_partner_commissions(p_agent_id uuid, p_super_partner_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count int := 0;
  r RECORD;
  v_rate numeric;
  v_client_share numeric;
  v_total_client_revenue numeric;
  v_gross_revenue numeric;
  v_amount numeric;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Only administrators can backfill commissions';
  END IF;

  v_rate := public.get_super_partner_rate(p_super_partner_id);

  FOR r IN
    SELECT id, client_share_percentage, content
    FROM public.proposals
    WHERE agent_id = p_agent_id
      AND signed_at IS NOT NULL
      AND deleted_at IS NULL
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.super_partner_commissions
      WHERE proposal_id = r.id AND super_partner_id = p_super_partner_id
    ) THEN
      CONTINUE;
    END IF;

    v_client_share := COALESCE(r.client_share_percentage, 0);
    v_total_client_revenue := COALESCE((r.content -> 'financials' ->> 'totalClientRevenue')::numeric, 0);
    v_gross_revenue := CASE WHEN v_client_share > 0 AND v_total_client_revenue > 0
                            THEN v_total_client_revenue / (v_client_share / 100.0)
                            ELSE 0 END;
    v_amount := v_gross_revenue * v_rate / 100.0;

    INSERT INTO public.super_partner_commissions
      (super_partner_id, agent_id, proposal_id, commission_rate, commission_amount, commission_status, calculated_at, notes)
    VALUES
      (p_super_partner_id, p_agent_id, r.id, v_rate, v_amount, 'pending', now(), 'backfilled');

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 13) recalc platform fee (admin-only)
CREATE OR REPLACE FUNCTION public.recalc_proposal_platform_fee(p_proposal_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Only administrators can recalc platform fee';
  END IF;
  UPDATE public.proposals
  SET platform_fee_percentage = 100
       - COALESCE(client_share_percentage, 0)
       - COALESCE(agent_commission_percentage, 0)
       - COALESCE(super_partner_commission_percentage, 0),
      platform_fee_override = true
  WHERE id = p_proposal_id;
END;
$$;

-- 14) get_super_partner_agents
CREATE OR REPLACE FUNCTION public.get_super_partner_agents()
RETURNS TABLE(
  agent_id uuid,
  agent_name text,
  agent_email text,
  company_name text,
  agent_status text,
  mwp_contributed numeric,
  proposal_count bigint,
  linked_at timestamptz
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_super_partner(auth.uid()) OR public.is_current_user_admin()) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT
    p.id,
    TRIM(CONCAT(COALESCE(p.first_name,''),' ',COALESCE(p.last_name,''))),
    p.email,
    p.company_name,
    p.agent_status,
    COALESCE(SUM(pr.system_size_kwp) FILTER (WHERE pr.signed_at IS NOT NULL AND pr.deleted_at IS NULL), 0) / 1000.0,
    COUNT(pr.id) FILTER (WHERE pr.signed_at IS NOT NULL AND pr.deleted_at IS NULL),
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.proposals pr ON pr.agent_id = p.id
  WHERE p.super_partner_id = auth.uid()
    AND p.deleted_at IS NULL
  GROUP BY p.id;
END;
$$;

-- 15) get_super_partner_dashboard_stats
CREATE OR REPLACE FUNCTION public.get_super_partner_dashboard_stats()
RETURNS TABLE(
  total_agents bigint,
  aggregated_mwp numeric,
  current_rate numeric,
  pending_commission numeric,
  paid_commission numeric
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sp uuid := auth.uid();
BEGIN
  IF NOT public.is_super_partner(v_sp) THEN RETURN; END IF;
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.profiles WHERE super_partner_id = v_sp AND deleted_at IS NULL),
    COALESCE((SELECT SUM(pr.system_size_kwp)
              FROM public.proposals pr
              JOIN public.profiles p ON p.id = pr.agent_id
              WHERE p.super_partner_id = v_sp
                AND pr.signed_at IS NOT NULL
                AND pr.deleted_at IS NULL), 0) / 1000.0,
    public.get_super_partner_rate(v_sp),
    COALESCE((SELECT SUM(commission_amount) FROM public.super_partner_commissions
              WHERE super_partner_id = v_sp AND commission_status = 'pending'), 0),
    COALESCE((SELECT SUM(commission_amount) FROM public.super_partner_commissions
              WHERE super_partner_id = v_sp AND commission_status = 'paid'), 0);
END;
$$;
