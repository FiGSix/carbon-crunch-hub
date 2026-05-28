
ALTER TABLE public.discovery_candidates
  ADD COLUMN IF NOT EXISTS segment text,
  ADD COLUMN IF NOT EXISTS completeness_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completeness_missing text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS research_status text,
  ADD COLUMN IF NOT EXISTS outreach_status text,
  ADD COLUMN IF NOT EXISTS sales_status text,
  ADD COLUMN IF NOT EXISTS location_country text,
  ADD COLUMN IF NOT EXISTS location_region text,
  ADD COLUMN IF NOT EXISTS fit_reason text;

-- Backfill segment from lead_segment if present
UPDATE public.discovery_candidates SET segment = lead_segment WHERE segment IS NULL AND lead_segment IS NOT NULL;

CREATE OR REPLACE FUNCTION public.recalc_lead_completeness()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  score int := 0;
  missing text[] := ARRAY[]::text[];
  loc_lower text := lower(coalesce(NEW.location, '') || ' ' || coalesce(NEW.location_country, '') || ' ' || coalesce(NEW.location_region, ''));
  is_sa boolean := false;
  seg_lower text := lower(coalesce(NEW.segment, NEW.lead_segment, ''));
BEGIN
  -- SA detection
  IF NEW.location_country IS NOT NULL AND upper(NEW.location_country) IN ('ZA','SOUTH AFRICA','RSA') THEN
    is_sa := true;
  ELSIF loc_lower ~ '(south africa|johannesburg|cape town|durban|pretoria|gauteng|western cape|eastern cape|kwazulu|mpumalanga|limpopo|north west|free state|northern cape|sandton|stellenbosch|port elizabeth|gqeberha|bloemfontein|polokwane|nelspruit)' THEN
    is_sa := true;
  END IF;

  IF coalesce(trim(NEW.company_name), '') <> '' THEN score := score + 15; ELSE missing := array_append(missing, 'company_name'); END IF;
  IF coalesce(trim(NEW.contact_name), '') <> '' THEN score := score + 15; ELSE missing := array_append(missing, 'contact_name'); END IF;
  IF coalesce(trim(NEW.email), '') <> '' AND NEW.email LIKE '%@%' THEN score := score + 20; ELSE missing := array_append(missing, 'contact_email'); END IF;
  IF coalesce(trim(NEW.website), '') <> '' THEN score := score + 15; ELSE missing := array_append(missing, 'website'); END IF;
  IF is_sa THEN score := score + 15; ELSE missing := array_append(missing, 'sa_location'); END IF;
  IF seg_lower <> '' AND seg_lower <> 'unknown' THEN score := score + 10; ELSE missing := array_append(missing, 'segment'); END IF;
  IF coalesce(NEW.fit_score, 0) >= 1 THEN score := score + 10; ELSE missing := array_append(missing, 'fit_score'); END IF;

  NEW.completeness_score := score;
  NEW.completeness_missing := missing;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_lead_completeness ON public.discovery_candidates;
CREATE TRIGGER trg_recalc_lead_completeness
BEFORE INSERT OR UPDATE OF company_name, contact_name, email, website, location, location_country, location_region, segment, lead_segment, fit_score
ON public.discovery_candidates
FOR EACH ROW EXECUTE FUNCTION public.recalc_lead_completeness();

-- Backfill all existing rows
UPDATE public.discovery_candidates SET company_name = company_name;
