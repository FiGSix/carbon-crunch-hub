-- Backfill client referral links for eligible Super Partners
INSERT INTO public.referral_links (owner_id, link_type)
SELECT p.id, 'client'
FROM public.profiles p
WHERE p.role = 'super_partner'
  AND p.can_create_proposals = true
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.referral_links rl
    WHERE rl.owner_id = p.id AND rl.link_type = 'client'
  );

-- Update handle_new_user trigger: also create a client referral link
-- for super partners signing up with can_create_proposals = true
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
  END IF;

  -- Auto-create referral link(s) for partners and super partners
  IF user_role IN ('agent', 'super_partner') THEN
    INSERT INTO public.referral_links (owner_id, link_type)
    VALUES (NEW.id, CASE WHEN user_role = 'agent' THEN 'client' ELSE 'agent' END)
    ON CONFLICT (owner_id, link_type) DO NOTHING;

    -- Super partners with can_create_proposals also get a client link
    IF user_role = 'super_partner' AND v_can_create_proposals THEN
      INSERT INTO public.referral_links (owner_id, link_type)
      VALUES (NEW.id, 'client')
      ON CONFLICT (owner_id, link_type) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;