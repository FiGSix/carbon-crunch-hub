
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
      INSERT INTO public.super_partner_link_requests
        (super_partner_id, company_id, request_type, status)
      VALUES (v_link.owner_id, v_company_id, 'link', 'pending')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  UPDATE public.referral_links SET signups = signups + 1 WHERE id = v_link.id;
  INSERT INTO public.referral_events (referral_link_id, event_type, user_id)
  VALUES (v_link.id, 'signup', p_new_user_id);
END;
$function$;
