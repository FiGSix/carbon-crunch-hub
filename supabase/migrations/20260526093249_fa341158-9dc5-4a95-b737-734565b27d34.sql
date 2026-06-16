
-- Helper: extract lowercase email domain
CREATE OR REPLACE FUNCTION public.email_domain_of(email_addr text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(split_part(email_addr, '@', 2));
$$;

-- Trigger fn: set clients.client_company_id from matching client_companies.email_domain
CREATE OR REPLACE FUNCTION public.clients_autolink_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_id uuid;
BEGIN
  IF NEW.client_company_id IS NULL AND NEW.email IS NOT NULL THEN
    SELECT id INTO matched_id
    FROM public.client_companies
    WHERE lower(email_domain) = public.email_domain_of(NEW.email)
    LIMIT 1;
    IF matched_id IS NOT NULL THEN
      NEW.client_company_id := matched_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_autolink_company_trg ON public.clients;
CREATE TRIGGER clients_autolink_company_trg
BEFORE INSERT OR UPDATE OF email, client_company_id ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.clients_autolink_company();

-- Trigger fn: when a client_company is created/updated, backfill matching contacts
CREATE OR REPLACE FUNCTION public.client_companies_backfill_contacts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_domain IS NOT NULL THEN
    UPDATE public.clients
    SET client_company_id = NEW.id
    WHERE client_company_id IS NULL
      AND email IS NOT NULL
      AND public.email_domain_of(email) = lower(NEW.email_domain);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS client_companies_backfill_contacts_trg ON public.client_companies;
CREATE TRIGGER client_companies_backfill_contacts_trg
AFTER INSERT OR UPDATE OF email_domain ON public.client_companies
FOR EACH ROW
EXECUTE FUNCTION public.client_companies_backfill_contacts();

-- One-time backfill of existing contacts
UPDATE public.clients c
SET client_company_id = cc.id
FROM public.client_companies cc
WHERE c.client_company_id IS NULL
  AND c.email IS NOT NULL
  AND public.email_domain_of(c.email) = lower(cc.email_domain);
