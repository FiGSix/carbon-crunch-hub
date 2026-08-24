-- 1. Shared normalisation used for duplicate detection
CREATE OR REPLACE FUNCTION public.normalize_company_name(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT regexp_replace(
           trim(regexp_replace(
             regexp_replace(lower(coalesce(_name, '')), '[^a-z0-9]+', ' ', 'g'),
             '\y(pty|ltd|limited|inc|cc|proprietary|co|group)\y', '', 'g')),
           '\s+', '', 'g');
$$;

-- Placeholder names auto-derived from personal email domains must never be
-- treated as one shared company.
CREATE OR REPLACE FUNCTION public.is_placeholder_company_name(_name text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(trim(coalesce(_name, ''))) IN (
    'gmail com','outlook com','hotmail com','yahoo com','icloud com','me com',
    'gmail.com','outlook.com','hotmail.com','yahoo.com','icloud.com','me.com'
  );
$$;

-- 2. Guard against two real companies with the same name
CREATE UNIQUE INDEX IF NOT EXISTS client_companies_unique_normalized_name
  ON public.client_companies (public.normalize_company_name(company_name))
  WHERE public.normalize_company_name(company_name) <> ''
    AND NOT public.is_placeholder_company_name(company_name);

-- 3. Single resolver used by every contact-creation path
CREATE OR REPLACE FUNCTION public.resolve_client_company(
  p_company_name text,
  p_email text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name   text := nullif(trim(coalesce(p_company_name, '')), '');
  v_norm   text;
  v_domain text;
  v_id     uuid;
BEGIN
  IF v_name IS NULL THEN
    RETURN NULL;
  END IF;

  v_norm := public.normalize_company_name(v_name);
  v_domain := CASE WHEN p_email IS NULL THEN NULL
                   ELSE public.extract_corporate_domain(p_email) END;

  -- Match on corporate email domain first (strongest signal)
  IF v_domain IS NOT NULL THEN
    SELECT id INTO v_id FROM public.client_companies
    WHERE lower(email_domain) = v_domain LIMIT 1;
  END IF;

  -- Then on the normalised company name
  IF v_id IS NULL AND v_norm <> '' AND NOT public.is_placeholder_company_name(v_name) THEN
    SELECT id INTO v_id FROM public.client_companies
    WHERE public.normalize_company_name(company_name) = v_norm LIMIT 1;
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.client_companies (company_name, email_domain, created_by)
    VALUES (v_name, v_domain, p_created_by)
    RETURNING id INTO v_id;
  ELSIF v_domain IS NOT NULL THEN
    -- Backfill the domain on a company that was created without one
    UPDATE public.client_companies
    SET email_domain = v_domain, updated_at = now()
    WHERE id = v_id AND email_domain IS NULL;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_client_company(text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_client_company(text, text, uuid) TO service_role;

-- 4. Contact autolink now also matches on company name, not just domain
CREATE OR REPLACE FUNCTION public.clients_autolink_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_id uuid;
  v_norm text;
BEGIN
  IF NEW.client_company_id IS NULL THEN
    IF NEW.email IS NOT NULL THEN
      SELECT id INTO matched_id
      FROM public.client_companies
      WHERE lower(email_domain) = public.email_domain_of(NEW.email)
      LIMIT 1;
    END IF;

    IF matched_id IS NULL AND NEW.company_name IS NOT NULL THEN
      v_norm := public.normalize_company_name(NEW.company_name);
      IF v_norm <> '' AND NOT public.is_placeholder_company_name(NEW.company_name) THEN
        SELECT id INTO matched_id
        FROM public.client_companies
        WHERE public.normalize_company_name(company_name) = v_norm
        LIMIT 1;
      END IF;
    END IF;

    IF matched_id IS NOT NULL THEN
      NEW.client_company_id := matched_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Client self-signup reuses a matching company by name too
CREATE OR REPLACE FUNCTION public.auto_create_client_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain TEXT;
  v_company_id UUID;
  v_company_name TEXT;
  v_norm TEXT;
BEGIN
  IF NEW.role != 'client' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM client_company_members
    WHERE user_id = NEW.id AND status = 'active'
  ) THEN
    RETURN NEW;
  END IF;

  v_domain := public.extract_corporate_domain(NEW.email);

  v_company_name := COALESCE(
    NULLIF(TRIM(NEW.company_name), ''),
    INITCAP(REPLACE(SPLIT_PART(NEW.email, '@', 2), '.', ' '))
  );

  IF v_domain IS NOT NULL THEN
    SELECT id INTO v_company_id
    FROM client_companies
    WHERE lower(email_domain) = v_domain
    LIMIT 1;
  END IF;

  IF v_company_id IS NULL AND NOT public.is_placeholder_company_name(v_company_name) THEN
    v_norm := public.normalize_company_name(v_company_name);
    IF v_norm <> '' THEN
      SELECT id INTO v_company_id
      FROM client_companies
      WHERE public.normalize_company_name(company_name) = v_norm
      LIMIT 1;
    END IF;
  END IF;

  IF v_company_id IS NULL THEN
    INSERT INTO client_companies (company_name, email_domain, created_by)
    VALUES (v_company_name, v_domain, NEW.id)
    RETURNING id INTO v_company_id;
  ELSIF v_domain IS NOT NULL THEN
    UPDATE client_companies
    SET email_domain = v_domain, updated_at = now()
    WHERE id = v_company_id AND email_domain IS NULL;
  END IF;

  INSERT INTO client_company_members (
    client_company_id, user_id, role, status, can_sign_agreements, invited_by
  ) VALUES (
    v_company_id, NEW.id, 'account_admin', 'active', true, NEW.id
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- 6. Admin helper to fold a duplicate into the company being kept
CREATE OR REPLACE FUNCTION public.merge_client_companies(_keep_id uuid, _drop_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF _keep_id = _drop_id THEN
    RAISE EXCEPTION 'Cannot merge a company into itself';
  END IF;

  UPDATE public.clients SET client_company_id = _keep_id WHERE client_company_id = _drop_id;

  UPDATE public.client_company_members m
  SET client_company_id = _keep_id
  WHERE m.client_company_id = _drop_id
    AND NOT EXISTS (
      SELECT 1 FROM public.client_company_members k
      WHERE k.client_company_id = _keep_id AND k.user_id = m.user_id
    );

  UPDATE public.client_team_invitations SET client_company_id = _keep_id WHERE client_company_id = _drop_id;

  UPDATE public.client_companies kc
  SET email_domain = COALESCE(kc.email_domain, dc.email_domain),
      registration_number = COALESCE(kc.registration_number, dc.registration_number),
      updated_at = now()
  FROM public.client_companies dc
  WHERE kc.id = _keep_id AND dc.id = _drop_id;

  DELETE FROM public.client_companies WHERE id = _drop_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.merge_client_companies(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merge_client_companies(uuid, uuid) TO service_role;