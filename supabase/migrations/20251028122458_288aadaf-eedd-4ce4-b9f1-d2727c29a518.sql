-- Fix extract_corporate_domain function to have proper search_path
CREATE OR REPLACE FUNCTION public.extract_corporate_domain(email_param text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
DECLARE
  domain TEXT;
  personal_domains TEXT[] := ARRAY['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'me.com'];
BEGIN
  -- Extract domain from email
  domain := LOWER(SPLIT_PART(email_param, '@', 2));
  
  -- Return NULL if it's a personal email domain
  IF domain = ANY(personal_domains) THEN
    RETURN NULL;
  END IF;
  
  RETURN domain;
END;
$function$;