CREATE OR REPLACE FUNCTION public.admin_unlink_person_from_company(_person_id uuid, _is_client_record boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed integer := 0;
  n integer;
  target_user uuid;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Only admins can unlink a person from a company';
  END IF;

  IF _is_client_record THEN
    SELECT c.user_id INTO target_user FROM clients c WHERE c.id = _person_id;

    UPDATE clients
       SET client_company_id = NULL, company_name = NULL, last_modified_by = auth.uid()
     WHERE id = _person_id AND (client_company_id IS NOT NULL OR company_name IS NOT NULL);
    GET DIAGNOSTICS n = ROW_COUNT; removed := removed + n;
  ELSE
    target_user := _person_id;
  END IF;

  IF target_user IS NOT NULL THEN
    DELETE FROM company_members WHERE user_id = target_user;
    GET DIAGNOSTICS n = ROW_COUNT; removed := removed + n;

    DELETE FROM client_company_members WHERE user_id = target_user;
    GET DIAGNOSTICS n = ROW_COUNT; removed := removed + n;

    UPDATE clients
       SET client_company_id = NULL, company_name = NULL, last_modified_by = auth.uid()
     WHERE user_id = target_user AND (client_company_id IS NOT NULL OR company_name IS NOT NULL);
    GET DIAGNOSTICS n = ROW_COUNT; removed := removed + n;

    UPDATE profiles SET company_name = NULL
     WHERE id = target_user AND company_name IS NOT NULL;
    GET DIAGNOSTICS n = ROW_COUNT; removed := removed + n;
  END IF;

  IF removed = 0 THEN
    RAISE EXCEPTION 'No company link found for this person';
  END IF;

  RETURN jsonb_build_object('removed', removed);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_link_person_to_company(
  _person_id uuid,
  _company_id uuid,
  _company_kind text,
  _role text DEFAULT 'member',
  _is_client_record boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_name text;
  target_user uuid;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Only admins can link a person to a company';
  END IF;

  IF _company_kind NOT IN ('agent', 'client') THEN
    RAISE EXCEPTION 'Unknown company type: %', _company_kind;
  END IF;

  IF _company_kind = 'client' THEN
    SELECT cc.company_name INTO resolved_name FROM client_companies cc WHERE cc.id = _company_id;
  ELSE
    SELECT c.company_name INTO resolved_name FROM companies c WHERE c.id = _company_id;
  END IF;

  IF resolved_name IS NULL THEN
    RAISE EXCEPTION 'Company not found';
  END IF;

  IF _is_client_record THEN
    IF _company_kind <> 'client' THEN
      RAISE EXCEPTION 'Client records can only be linked to a client company';
    END IF;

    SELECT c.user_id INTO target_user FROM clients c WHERE c.id = _person_id;

    UPDATE clients
       SET client_company_id = _company_id, company_name = resolved_name, last_modified_by = auth.uid()
     WHERE id = _person_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Client record not found';
    END IF;
  ELSE
    target_user := _person_id;
  END IF;

  IF target_user IS NULL THEN
    RETURN jsonb_build_object('company_id', _company_id, 'company_name', resolved_name);
  END IF;

  -- Replace any previous link of either type
  DELETE FROM company_members WHERE user_id = target_user;
  DELETE FROM client_company_members WHERE user_id = target_user;

  IF _company_kind = 'client' THEN
    INSERT INTO client_company_members (user_id, client_company_id, role, status, invited_by, approved_by, approved_at)
    VALUES (
      target_user, _company_id,
      CASE WHEN _role IN ('team_lead', 'account_admin') THEN 'account_admin' ELSE 'member' END,
      'active', auth.uid(), auth.uid(), now()
    );

    UPDATE clients
       SET client_company_id = _company_id, company_name = resolved_name, last_modified_by = auth.uid()
     WHERE user_id = target_user;
  ELSE
    INSERT INTO company_members (user_id, company_id, role, status, invited_by, approved_by, approved_at)
    VALUES (
      target_user, _company_id,
      CASE WHEN _role = 'team_lead' THEN 'team_lead' ELSE 'member' END,
      'active', auth.uid(), auth.uid(), now()
    );
  END IF;

  UPDATE profiles SET company_name = resolved_name WHERE id = target_user;

  RETURN jsonb_build_object('company_id', _company_id, 'company_name', resolved_name);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_unlink_person_from_company(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_link_person_to_company(uuid, uuid, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_unlink_person_from_company(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_link_person_to_company(uuid, uuid, text, text, boolean) TO authenticated, service_role;