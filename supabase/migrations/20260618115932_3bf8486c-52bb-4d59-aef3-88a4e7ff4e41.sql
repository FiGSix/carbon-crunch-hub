
-- 1. Non-promoting sync_super_partner_status
CREATE OR REPLACE FUNCTION public.sync_super_partner_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.super_partner_status = 'suspended' THEN
    -- Demote only if currently a super_partner
    IF NEW.role = 'super_partner' THEN
      UPDATE public.profiles SET role = 'agent' WHERE id = NEW.id;
      NEW.role := 'agent';
      DELETE FROM public.user_roles
        WHERE user_id = NEW.id AND role = 'super_partner';
      INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'agent')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  ELSIF NEW.super_partner_status = 'active' THEN
    -- Only ENFORCE existing SP role; do NOT promote agents/clients here.
    -- Promotion must go through public.upgrade_agent_to_super_partner.
    IF NEW.role = 'super_partner' THEN
      INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'super_partner')
        ON CONFLICT (user_id, role) DO NOTHING;
      -- Defensive cleanup: a super_partner should not also carry the agent role
      DELETE FROM public.user_roles
        WHERE user_id = NEW.id AND role = 'agent';
    ELSE
      RAISE NOTICE 'sync_super_partner_status: refusing to auto-promote user % (role=%) — use upgrade_agent_to_super_partner instead', NEW.id, NEW.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. handle_new_user: also consume team_invitations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  v_target_company_id uuid;
  v_can_create_proposals boolean;
  v_team_inv RECORD;
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
    -- (a) Legacy agent_invitations path
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

    -- (b) team_invitations path (most common: invited by a team_lead)
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

  -- Auto-create referral link(s) for partners and super partners
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

  RETURN NEW;
END;
$$;

-- 3. mark_invitation_accepted_on_profile_creation: also mark team_invitations
CREATE OR REPLACE FUNCTION public.mark_invitation_accepted_on_profile_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'agent' THEN
    UPDATE public.agent_invitations
       SET status = 'accepted', accepted_at = NEW.created_at
     WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
       AND status = 'pending'
       AND expires_at > now();

    UPDATE public.team_invitations
       SET status = 'accepted', accepted_at = NEW.created_at, updated_at = now()
     WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
       AND status = 'pending'
       AND expires_at > now();
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Repair Elize's account
UPDATE public.profiles
   SET role = 'agent',
       super_partner_status = NULL,
       can_create_proposals = false
 WHERE id = 'e4762177-cd64-46ce-a745-adebec47e621';

DELETE FROM public.user_roles
 WHERE user_id = 'e4762177-cd64-46ce-a745-adebec47e621'
   AND role = 'super_partner';

INSERT INTO public.user_roles (user_id, role)
VALUES ('e4762177-cd64-46ce-a745-adebec47e621', 'agent')
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.team_invitations
   SET status = 'accepted', accepted_at = now(), updated_at = now()
 WHERE email = 'projects@energygurus.co.za'
   AND status = 'pending';

-- 5. Audit: surface other accidentally-promoted accounts (dual role rows)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.id, p.email, p.role
      FROM public.profiles p
      JOIN public.user_roles ur_sp
        ON ur_sp.user_id = p.id AND ur_sp.role = 'super_partner'
      JOIN public.user_roles ur_ag
        ON ur_ag.user_id = p.id AND ur_ag.role = 'agent'
  LOOP
    RAISE NOTICE 'DUAL ROLE (agent + super_partner) — review: id=% email=% profile_role=%', r.id, r.email, r.role;
  END LOOP;
END $$;
