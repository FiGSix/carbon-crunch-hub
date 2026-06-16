-- Step 1: Update the log function to handle NULL user IDs during migrations
CREATE OR REPLACE FUNCTION public.log_client_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only log if we have a valid user context (not during migrations)
  IF auth.uid() IS NOT NULL THEN
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
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 2: Fix existing orphaned clients by linking them to their registered user profiles
UPDATE clients c
SET 
  user_id = p.id,
  updated_at = now()
FROM profiles p
WHERE 
  c.email = p.email
  AND c.user_id IS NULL
  AND p.role = 'client';

-- Step 3: Create or replace the trigger function to auto-link clients on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Insert profile for the new user
  INSERT INTO public.profiles (id, email, role, first_name, last_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    NEW.raw_user_meta_data->>'first_name', 
    NEW.raw_user_meta_data->>'last_name'
  );

  -- If user is a client, link any existing client records with matching email
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'client') = 'client' THEN
    UPDATE clients
    SET 
      user_id = NEW.id,
      updated_at = now()
    WHERE 
      email = NEW.email
      AND user_id IS NULL;
    
    -- Log the linkage for debugging
    RAISE NOTICE 'Linked client records for user % with email %', NEW.id, NEW.email;
  END IF;

  RETURN NEW;
END;
$$;

-- Step 4: Ensure the trigger exists (recreate if needed)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();