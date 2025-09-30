-- Fix remaining functions missing search_path
-- These are trigger functions and other utility functions

-- Fix normalize_system_size_to_kwp function
CREATE OR REPLACE FUNCTION public.normalize_system_size_to_kwp(
  size_value numeric,
  unit_type text DEFAULT 'kWp'::text
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $function$
BEGIN
  IF size_value IS NULL THEN
    RETURN NULL;
  END IF;
  
  CASE LOWER(unit_type)
    WHEN 'kwp', 'kw' THEN
      RETURN size_value;
    WHEN 'mwp', 'mw' THEN
      RETURN size_value * 1000;
    ELSE
      RETURN size_value;
  END CASE;
END;
$function$;

-- Fix format_system_size_for_display function
CREATE OR REPLACE FUNCTION public.format_system_size_for_display(
  size_kwp numeric,
  preferred_unit text DEFAULT 'auto'::text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $function$
BEGIN
  IF size_kwp IS NULL THEN
    RETURN NULL;
  END IF;
  
  CASE LOWER(preferred_unit)
    WHEN 'kwp', 'kw' THEN
      RETURN size_kwp::TEXT || ' kWp';
    WHEN 'mwp', 'mw' THEN
      RETURN (size_kwp / 1000.0)::NUMERIC(10,3)::TEXT || ' MWp';
    WHEN 'auto' THEN
      IF size_kwp >= 1000 THEN
        RETURN (size_kwp / 1000.0)::NUMERIC(10,3)::TEXT || ' MWp';
      ELSE
        RETURN size_kwp::TEXT || ' kWp';
      END IF;
    ELSE
      IF size_kwp >= 1000 THEN
        RETURN (size_kwp / 1000.0)::NUMERIC(10,3)::TEXT || ' MWp';
      ELSE
        RETURN size_kwp::TEXT || ' kWp';
      END IF;
  END CASE;
END;
$function$;

-- Fix validate_system_size trigger function
CREATE OR REPLACE FUNCTION public.validate_system_size()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.system_size_kwp IS NOT NULL AND NEW.system_size_kwp <= 0 THEN
    RAISE EXCEPTION 'System size must be greater than 0 kWp';
  END IF;
  
  IF NEW.system_size_kwp IS NOT NULL AND NEW.system_size_kwp > 15000 THEN
    RAISE EXCEPTION 'System size cannot exceed 15,000 kWp (15 MWp)';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix generate_secure_token function
CREATE OR REPLACE FUNCTION public.generate_secure_token()
RETURNS text
LANGUAGE sql
SET search_path = 'public'
AS $function$
  SELECT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
$function$;

-- Fix update_system_settings_updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_system_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$function$;

-- Fix update_modified_columns trigger function
CREATE OR REPLACE FUNCTION public.update_modified_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  NEW.last_modified_by = auth.uid();
  RETURN NEW;
END;
$function$;

-- Fix update_agent_last_active trigger function
CREATE OR REPLACE FUNCTION public.update_agent_last_active()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.role = 'agent' THEN
    NEW.last_active_at = now();
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix track_agent_status_change trigger function
CREATE OR REPLACE FUNCTION public.track_agent_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  IF OLD.agent_status IS DISTINCT FROM NEW.agent_status THEN
    NEW.status_changed_at = now();
    NEW.status_changed_by = auth.uid();
    
    INSERT INTO public.agent_activities (
      agent_id,
      activity_type,
      activity_data
    ) VALUES (
      NEW.id,
      'status_changed',
      jsonb_build_object(
        'old_status', OLD.agent_status,
        'new_status', NEW.agent_status,
        'changed_by', auth.uid()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix log_proposal_status_change trigger function
CREATE OR REPLACE FUNCTION public.log_proposal_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      related_type,
      related_id
    ) VALUES (
      NEW.agent_id,
      'info',
      'Proposal Status Updated',
      format('Proposal "%s" status changed from %s to %s', NEW.title, OLD.status, NEW.status),
      'proposal',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix transfer_agent_clients_to_crunch_carbon trigger function (already has correct search_path)
-- This function already has SET search_path = 'public'

-- Fix set_request_invitation_token functions
CREATE OR REPLACE FUNCTION public.set_request_invitation_token(token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  PERFORM set_config('request.invitation_token', token, true);
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_request_invitation_token(email_input text, token_input text)
RETURNS void
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  RAISE NOTICE 'Token set: % for %', token_input, email_input;
END;
$function$;

-- Fix auth_user_id and auth_user_role functions
CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    'client'
  );
$function$;