
-- 1) Fix apply_referral_on_signup: attribute referred_by_agent_id for both link types
CREATE OR REPLACE FUNCTION public.apply_referral_on_signup(p_token text, p_new_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
         referred_by_agent_id = v_link.owner_id
   WHERE id = p_new_user_id;

  IF v_link.link_type = 'agent' THEN
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
$function$;

-- 2) Extend handle_new_user to apply referral attribution server-side from raw_user_meta_data.ref_token
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role TEXT;
  v_target_company_id uuid;
  v_can_create_proposals boolean;
  v_team_inv RECORD;
  v_ref_token text;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
  v_can_create_proposals := COALESCE((NEW.raw_user_meta_data->>'can_create_proposals')::boolean, false);

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

    SELECT id, company_id, invited_by
      INTO v_team_inv
      FROM public.team_invitations
     WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
       AND status = 'pending'
       AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1;

    IF v_team_inv.id IS NOT NULL THEN
      INSERT INTO public.company_members
        (company_id, user_id, role, status, invited_by, approved_by, invited_at, approved_at)
      VALUES
        (v_team_inv.company_id, NEW.id, 'agent', 'active',
         v_team_inv.invited_by, v_team_inv.invited_by, now(), now())
      ON CONFLICT DO NOTHING;

      UPDATE public.team_invitations
         SET status = 'accepted', accepted_at = NEW.created_at, updated_at = now()
       WHERE id = v_team_inv.id;
    END IF;
  END IF;

  IF user_role IN ('agent', 'super_partner') THEN
    INSERT INTO public.referral_links (owner_id, link_type)
    VALUES (NEW.id, CASE WHEN user_role = 'agent' THEN 'client' ELSE 'agent' END)
    ON CONFLICT (owner_id, link_type) DO NOTHING;

    IF user_role = 'super_partner' AND v_can_create_proposals THEN
      INSERT INTO public.referral_links (owner_id, link_type)
      VALUES (NEW.id, 'client')
      ON CONFLICT (owner_id, link_type) DO NOTHING;
    END IF;
  END IF;

  -- Apply referral attribution server-side if ref_token supplied at signup
  v_ref_token := NEW.raw_user_meta_data->>'ref_token';
  IF v_ref_token IS NOT NULL AND length(v_ref_token) > 0 THEN
    BEGIN
      PERFORM public.apply_referral_on_signup(v_ref_token, NEW.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'apply_referral_on_signup failed for user % token %: %', NEW.id, v_ref_token, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;
