
-- 1) New per-SP override columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sp_commission_override numeric,
  ADD COLUMN IF NOT EXISTS recruit_default_commission numeric;

COMMENT ON COLUMN public.profiles.sp_commission_override IS
  'Overrides get_super_partner_rate for this super partner when non-null.';
COMMENT ON COLUMN public.profiles.recruit_default_commission IS
  'Default companies.commission_override applied to companies recruited by this super partner.';

-- 2) get_super_partner_rate honours sp_commission_override
CREATE OR REPLACE FUNCTION public.get_super_partner_rate(p_super_partner_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_override numeric;
  total_kwp numeric;
  threshold_mwp numeric;
  rate1 numeric;
  rate2 numeric;
BEGIN
  IF p_super_partner_id IS NULL THEN RETURN 0; END IF;

  SELECT sp_commission_override INTO v_override
    FROM public.profiles WHERE id = p_super_partner_id;
  IF v_override IS NOT NULL THEN
    RETURN v_override;
  END IF;

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
END;
$$;

-- 3) Signing trigger: fall back to SP recruit_default_commission when company has no override
CREATE OR REPLACE FUNCTION public.handle_proposal_signing_commissions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sp_id uuid;
  v_sp_rate numeric := 0;
  v_sp_recruit_default numeric;
  v_client_share numeric;
  v_agent_pct numeric;
  v_company_kwp numeric := 0;
  v_company_override numeric;
  v_effective_override numeric;
  v_base_rate numeric;
  v_final_rate numeric;
  v_total_client_revenue numeric;
  v_gross_revenue numeric := 0;
  v_agent_amount numeric := 0;
  v_sp_amount numeric := 0;
  v_client_user_id uuid;
BEGIN
  IF NEW.signed_at IS NULL THEN RETURN NEW; END IF;
  IF NEW.agent_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.company_id IS NULL THEN
    NEW.company_id := public.ensure_agent_has_company(NEW.agent_id);
  END IF;

  SELECT super_partner_id, commission_override
    INTO v_sp_id, v_company_override
    FROM public.companies WHERE id = NEW.company_id;

  IF v_sp_id IS NOT NULL THEN
    SELECT recruit_default_commission INTO v_sp_recruit_default
      FROM public.profiles WHERE id = v_sp_id;
  END IF;

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
  v_effective_override := COALESCE(v_company_override, v_sp_recruit_default);
  v_final_rate := COALESCE(v_effective_override, v_base_rate);
  NEW.agent_commission_percentage := v_final_rate;
  v_agent_pct := v_final_rate;
  v_agent_amount := v_gross_revenue * v_final_rate / 100.0;

  IF NOT EXISTS (SELECT 1 FROM public.agent_commissions WHERE proposal_id = NEW.id) THEN
    INSERT INTO public.agent_commissions
      (agent_id, proposal_id, base_rate, override_rate, final_rate, commission_amount, commission_status, calculated_at)
    VALUES
      (NEW.agent_id, NEW.id, v_base_rate, v_effective_override, v_final_rate, v_agent_amount, 'pending', now());
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

  SELECT c.user_id INTO v_client_user_id
    FROM public.clients c
   WHERE c.id = NEW.client_reference_id;
  IF v_client_user_id IS NOT NULL THEN
    PERFORM public.log_referral_conversion(v_client_user_id);
  END IF;

  RETURN NEW;
END;
$$;

-- 4) apply_referral_on_signup promotes clients to agents on SP recruit links,
--    links the new agent's company to the SP, and applies the SP's default recruit rate.
CREATE OR REPLACE FUNCTION public.apply_referral_on_signup(p_token text, p_new_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_link public.referral_links%ROWTYPE;
  v_company_id uuid;
  v_already_signed_up boolean;
  v_current_role text;
  v_sp_default numeric;
BEGIN
  SELECT * INTO v_link
    FROM public.referral_links
   WHERE token = p_token AND is_active = true;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.referral_events
    WHERE referral_link_id = v_link.id
      AND user_id = p_new_user_id
      AND event_type = 'signup'
  ) INTO v_already_signed_up;

  UPDATE public.profiles
     SET referred_by_link_id  = v_link.id,
         referred_by_agent_id = v_link.owner_id
   WHERE id = p_new_user_id;

  IF v_link.link_type = 'agent' THEN
    SELECT role INTO v_current_role FROM public.profiles WHERE id = p_new_user_id;
    IF v_current_role = 'client' THEN
      UPDATE public.profiles
         SET role = 'agent',
             agent_status = COALESCE(agent_status, 'pending_approval')
       WHERE id = p_new_user_id;

      INSERT INTO public.user_roles (user_id, role)
      VALUES (p_new_user_id, 'agent'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;

      DELETE FROM public.user_roles
       WHERE user_id = p_new_user_id AND role = 'client'::app_role;
    END IF;

    v_company_id := public.ensure_agent_has_company(p_new_user_id);
    IF v_company_id IS NOT NULL THEN
      INSERT INTO public.super_partner_link_requests
        (super_partner_id, company_id, request_type, status)
      VALUES (v_link.owner_id, v_company_id, 'link', 'pending')
      ON CONFLICT DO NOTHING;

      -- Apply SP's default recruit rate to this new company if not already overridden
      SELECT recruit_default_commission INTO v_sp_default
        FROM public.profiles WHERE id = v_link.owner_id;
      IF v_sp_default IS NOT NULL THEN
        UPDATE public.companies
           SET commission_override = v_sp_default
         WHERE id = v_company_id
           AND commission_override IS NULL;
      END IF;
    END IF;
  END IF;

  IF NOT v_already_signed_up THEN
    UPDATE public.referral_links SET signups = signups + 1 WHERE id = v_link.id;
    INSERT INTO public.referral_events (referral_link_id, event_type, user_id)
    VALUES (v_link.id, 'signup', p_new_user_id);
  END IF;
END;
$function$;

-- 5) Admin helper: apply SP's recruit_default_commission to all currently-linked companies
CREATE OR REPLACE FUNCTION public.apply_sp_default_to_recruits(p_super_partner_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default numeric;
  v_count integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT recruit_default_commission INTO v_default
    FROM public.profiles WHERE id = p_super_partner_id;
  IF v_default IS NULL THEN RETURN 0; END IF;

  WITH upd AS (
    UPDATE public.companies
       SET commission_override = v_default
     WHERE super_partner_id = p_super_partner_id
       AND commission_override IS NULL
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM upd;

  -- Sync stored proposal rates for signed proposals whose company override changed
  UPDATE public.proposals p
     SET agent_commission_percentage = c.commission_override
    FROM public.companies c
   WHERE p.company_id = c.id
     AND c.super_partner_id = p_super_partner_id
     AND c.commission_override IS NOT NULL
     AND p.signed_at IS NOT NULL
     AND p.agent_commission_percentage IS DISTINCT FROM c.commission_override;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_sp_default_to_recruits(uuid) TO authenticated;

-- 6) Backfill: clients who signed up via SP recruit links → promote to agent
DO $$
DECLARE
  r RECORD;
  v_company_id uuid;
  v_sp_default numeric;
BEGIN
  FOR r IN
    SELECT p.id AS user_id, rl.owner_id AS sp_id, rl.id AS link_id
      FROM public.profiles p
      JOIN public.referral_links rl ON rl.id = p.referred_by_link_id
     WHERE rl.link_type = 'agent'
       AND p.role = 'client'
       AND p.deleted_at IS NULL
  LOOP
    UPDATE public.profiles
       SET role = 'agent',
           agent_status = COALESCE(agent_status, 'pending_approval')
     WHERE id = r.user_id;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (r.user_id, 'agent'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    DELETE FROM public.user_roles
     WHERE user_id = r.user_id AND role = 'client'::app_role;

    BEGIN
      v_company_id := public.ensure_agent_has_company(r.user_id);
      IF v_company_id IS NOT NULL THEN
        INSERT INTO public.super_partner_link_requests
          (super_partner_id, company_id, request_type, status)
        VALUES (r.sp_id, v_company_id, 'link', 'pending')
        ON CONFLICT DO NOTHING;

        SELECT recruit_default_commission INTO v_sp_default
          FROM public.profiles WHERE id = r.sp_id;
        IF v_sp_default IS NOT NULL THEN
          UPDATE public.companies
             SET commission_override = v_sp_default
           WHERE id = v_company_id
             AND commission_override IS NULL;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'backfill: ensure_agent_has_company failed for %: %', r.user_id, SQLERRM;
    END;
  END LOOP;
END $$;

-- 7) Backfill: apply SP recruit defaults to already-linked companies lacking an override
UPDATE public.companies c
   SET commission_override = sp.recruit_default_commission
  FROM public.profiles sp
 WHERE c.super_partner_id = sp.id
   AND sp.recruit_default_commission IS NOT NULL
   AND c.commission_override IS NULL;
