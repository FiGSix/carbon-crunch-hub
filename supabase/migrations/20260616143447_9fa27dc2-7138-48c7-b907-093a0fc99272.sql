-- =====================================================
-- Referral link system
-- =====================================================

-- 1. referral_links table
CREATE TABLE IF NOT EXISTS public.referral_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token       text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(12), 'hex'),
  link_type   text NOT NULL CHECK (link_type IN ('client', 'agent')),
  is_active   boolean NOT NULL DEFAULT true,
  clicks      integer NOT NULL DEFAULT 0,
  signups     integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, link_type)
);
CREATE INDEX IF NOT EXISTS referral_links_token_idx    ON public.referral_links (token);
CREATE INDEX IF NOT EXISTS referral_links_owner_id_idx ON public.referral_links (owner_id);

GRANT SELECT, UPDATE ON public.referral_links TO authenticated;
GRANT ALL ON public.referral_links TO service_role;

ALTER TABLE public.referral_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY referral_links_owner_select ON public.referral_links
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_current_user_admin());

CREATE POLICY referral_links_owner_update ON public.referral_links
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_current_user_admin())
  WITH CHECK (owner_id = auth.uid() OR public.is_current_user_admin());

CREATE POLICY referral_links_owner_insert ON public.referral_links
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR public.is_current_user_admin());

-- 2. referral_events table
CREATE TABLE IF NOT EXISTS public.referral_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_link_id uuid NOT NULL REFERENCES public.referral_links(id) ON DELETE CASCADE,
  event_type       text NOT NULL CHECK (event_type IN ('click', 'signup', 'conversion')),
  user_id          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata         jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS referral_events_link_type_idx
  ON public.referral_events (referral_link_id, event_type);

GRANT SELECT ON public.referral_events TO authenticated;
GRANT ALL ON public.referral_events TO service_role;

ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY referral_events_owner_select ON public.referral_events
  FOR SELECT TO authenticated
  USING (
    public.is_current_user_admin() OR EXISTS (
      SELECT 1 FROM public.referral_links rl
       WHERE rl.id = referral_events.referral_link_id
         AND rl.owner_id = auth.uid()
    )
  );

-- 3. profiles columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by_link_id  uuid REFERENCES public.referral_links(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referred_by_agent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_bio         text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_referral_bio_length;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_referral_bio_length CHECK (referral_bio IS NULL OR char_length(referral_bio) <= 300);

-- 4. Backfill referral links for existing agents and super partners
INSERT INTO public.referral_links (owner_id, link_type)
SELECT id, 'client'
  FROM public.profiles
 WHERE role = 'agent' AND deleted_at IS NULL
ON CONFLICT (owner_id, link_type) DO NOTHING;

INSERT INTO public.referral_links (owner_id, link_type)
SELECT id, 'agent'
  FROM public.profiles
 WHERE role = 'super_partner' AND deleted_at IS NULL
ON CONFLICT (owner_id, link_type) DO NOTHING;

-- 5. RPCs

-- Public partner-card lookup. Increments clicks and logs the click event.
CREATE OR REPLACE FUNCTION public.get_referral_partner_info(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link    public.referral_links%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_company public.companies%ROWTYPE;
BEGIN
  SELECT * INTO v_link
    FROM public.referral_links
   WHERE token = p_token AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('valid', false);
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_link.owner_id;

  SELECT co.* INTO v_company
    FROM public.company_members cm
    JOIN public.companies co ON co.id = cm.company_id
   WHERE cm.user_id = v_link.owner_id
     AND cm.status = 'active'
   ORDER BY cm.created_at ASC
   LIMIT 1;

  UPDATE public.referral_links SET clicks = clicks + 1 WHERE id = v_link.id;
  INSERT INTO public.referral_events (referral_link_id, event_type) VALUES (v_link.id, 'click');

  RETURN json_build_object(
    'valid',            true,
    'link_type',        v_link.link_type,
    'link_id',          v_link.id,
    'token',            v_link.token,
    'owner_id',         v_link.owner_id,
    'first_name',       v_profile.first_name,
    'last_name',        v_profile.last_name,
    'company_name',     COALESCE(v_company.company_name, v_profile.company_name),
    'avatar_url',       v_profile.avatar_url,
    'company_logo_url', v_profile.company_logo_url,
    'referral_bio',     v_profile.referral_bio
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_referral_partner_info(text) TO anon, authenticated, service_role;

-- Apply referral attribution on signup.
CREATE OR REPLACE FUNCTION public.apply_referral_on_signup(p_token text, p_new_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link public.referral_links%ROWTYPE;
  v_company_id uuid;
BEGIN
  SELECT * INTO v_link
    FROM public.referral_links
   WHERE token = p_token AND is_active = true;
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.profiles
     SET referred_by_link_id  = v_link.id,
         referred_by_agent_id = CASE WHEN v_link.link_type = 'client' THEN v_link.owner_id ELSE NULL END
   WHERE id = p_new_user_id;

  IF v_link.link_type = 'agent' THEN
    -- Ensure the new agent has a company, then queue a pending SP link request
    v_company_id := public.ensure_agent_has_company(p_new_user_id);
    IF v_company_id IS NOT NULL THEN
      INSERT INTO public.super_partner_link_requests (super_partner_id, company_id, status)
      VALUES (v_link.owner_id, v_company_id, 'pending')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  UPDATE public.referral_links SET signups = signups + 1 WHERE id = v_link.id;
  INSERT INTO public.referral_events (referral_link_id, event_type, user_id)
  VALUES (v_link.id, 'signup', p_new_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_referral_on_signup(text, uuid) TO authenticated, service_role;

-- Log a conversion (e.g. proposal signed) for a referred user.
CREATE OR REPLACE FUNCTION public.log_referral_conversion(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link_id uuid;
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;
  SELECT referred_by_link_id INTO v_link_id
    FROM public.profiles WHERE id = p_user_id;
  IF v_link_id IS NULL THEN RETURN; END IF;

  UPDATE public.referral_links SET conversions = conversions + 1 WHERE id = v_link_id;
  INSERT INTO public.referral_events (referral_link_id, event_type, user_id)
  VALUES (v_link_id, 'conversion', p_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_referral_conversion(uuid) TO authenticated, service_role;

-- 6. Update handle_new_user to auto-create a referral link for partners
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Auto-create referral link for partners and super partners
  IF user_role IN ('agent', 'super_partner') THEN
    INSERT INTO public.referral_links (owner_id, link_type)
    VALUES (NEW.id, CASE WHEN user_role = 'agent' THEN 'client' ELSE 'agent' END)
    ON CONFLICT (owner_id, link_type) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- 7. Update handle_proposal_signing_commissions to log referral conversion
CREATE OR REPLACE FUNCTION public.handle_proposal_signing_commissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sp_id uuid;
  v_sp_rate numeric := 0;
  v_client_share numeric;
  v_agent_pct numeric;
  v_company_kwp numeric := 0;
  v_company_override numeric;
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
  v_final_rate := COALESCE(v_company_override, v_base_rate);
  NEW.agent_commission_percentage := v_final_rate;
  v_agent_pct := v_final_rate;
  v_agent_amount := v_gross_revenue * v_final_rate / 100.0;

  IF NOT EXISTS (SELECT 1 FROM public.agent_commissions WHERE proposal_id = NEW.id) THEN
    INSERT INTO public.agent_commissions
      (agent_id, proposal_id, base_rate, override_rate, final_rate, commission_amount, commission_status, calculated_at)
    VALUES
      (NEW.agent_id, NEW.id, v_base_rate, v_company_override, v_final_rate, v_agent_amount, 'pending', now());
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

  -- Log referral conversion if the signing client was referred
  SELECT c.user_id INTO v_client_user_id
    FROM public.clients c
   WHERE c.id = NEW.client_reference_id;
  IF v_client_user_id IS NOT NULL THEN
    PERFORM public.log_referral_conversion(v_client_user_id);
  END IF;

  RETURN NEW;
END;
$function$;