
DO $$
DECLARE
  v_keep uuid := '4793e353-772d-45e2-9d37-3a8b643adacd';
  v_admin uuid := '6538aa1a-c0dc-4ce4-ab6f-bb4368d9fce1';
  r RECORD;
  v_true_role text;
BEGIN
  FOR r IN
    SELECT p.id, p.email
      FROM public.profiles p
     WHERE p.role = 'super_partner'
       AND p.deleted_at IS NULL
       AND p.id <> v_keep
  LOOP
    IF EXISTS (SELECT 1 FROM public.clients WHERE user_id = r.id) THEN
      v_true_role := 'client';
    ELSIF EXISTS (
      SELECT 1 FROM public.company_members
       WHERE user_id = r.id AND status = 'active'
    ) OR EXISTS (
      SELECT 1 FROM public.agent_invitations
       WHERE lower(email) = lower(r.email) AND status = 'accepted'
    ) THEN
      v_true_role := 'agent';
    ELSE
      v_true_role := 'client';
    END IF;

    UPDATE public.profiles
       SET role = v_true_role,
           super_partner_status = NULL,
           can_create_proposals = false
     WHERE id = r.id;

    DELETE FROM public.user_roles
     WHERE user_id = r.id AND role = 'super_partner';

    INSERT INTO public.user_roles (user_id, role)
    VALUES (r.id, v_true_role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.user_role_audit (user_id, role, action, performed_by, created_at)
    VALUES
      (r.id, 'super_partner'::app_role, 'removed', v_admin, now()),
      (r.id, v_true_role::app_role,     'added',   v_admin, now());
  END LOOP;
END $$;

UPDATE public.companies
   SET super_partner_id = NULL,
       super_partner_linked_at = NULL,
       super_partner_linked_by = NULL
 WHERE super_partner_id IS NOT NULL
   AND super_partner_id <> '4793e353-772d-45e2-9d37-3a8b643adacd';
