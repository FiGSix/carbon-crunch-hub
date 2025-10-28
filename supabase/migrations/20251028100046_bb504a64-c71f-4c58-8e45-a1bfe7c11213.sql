-- Fix all remaining trigger functions missing search_path

CREATE OR REPLACE FUNCTION public.track_agent_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.update_onboarding_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_client_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.client_access_audit (
      accessed_by,
      action,
      client_ids,
      result_count,
      old_values,
      new_values,
      modified_fields
    ) VALUES (
      auth.uid(),
      'update',
      ARRAY[NEW.id],
      1,
      to_jsonb(OLD),
      to_jsonb(NEW),
      jsonb_build_object(
        'fields_changed', (
          SELECT jsonb_object_agg(key, value)
          FROM jsonb_each(to_jsonb(NEW))
          WHERE to_jsonb(OLD) -> key IS DISTINCT FROM value
        )
      )
    );
  END IF;

  -- Log DELETE operations
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.client_access_audit (
      accessed_by,
      action,
      client_ids,
      result_count,
      old_values
    ) VALUES (
      auth.uid(),
      'delete',
      ARRAY[OLD.id],
      1,
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;