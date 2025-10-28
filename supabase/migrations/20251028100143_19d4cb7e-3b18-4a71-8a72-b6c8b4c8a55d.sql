-- Fix final trigger functions missing search_path

CREATE OR REPLACE FUNCTION public.notify_admins_on_new_agent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Only notify if this is a new agent with pending_approval status
  IF NEW.role = 'agent' AND NEW.agent_status = 'pending_approval' THEN
    
    -- Insert notification for each admin
    FOR admin_record IN 
      SELECT id FROM public.profiles WHERE role = 'admin'
    LOOP
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        related_type,
        related_id
      ) VALUES (
        admin_record.id,
        'info',
        'New Agent Awaiting Approval',
        format('Agent %s %s (%s) has registered and is awaiting approval.', 
          COALESCE(NEW.first_name, ''), 
          COALESCE(NEW.last_name, ''), 
          NEW.email
        ),
        'agent_approval',
        NEW.id
      );
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_onboarding_on_signature()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_project_id UUID;
  project_info JSONB;
  system_address_val TEXT;
  commissioning_date_val DATE;
  system_name_val TEXT;
  panel_total_kwp_val NUMERIC;
BEGIN
  -- Only proceed if signed_at changed from NULL to a value
  IF OLD.signed_at IS NULL AND NEW.signed_at IS NOT NULL THEN
    
    -- Extract projectInfo from proposal content
    project_info := NEW.content->'projectInfo';
    
    -- Extract values with fallbacks
    system_address_val := COALESCE(
      project_info->>'address',
      NULL
    );
    
    commissioning_date_val := COALESCE(
      (project_info->>'commissionDate')::DATE,
      NULL
    );
    
    system_name_val := COALESCE(
      project_info->>'name',
      NEW.title,
      NULL
    );
    
    -- Get panel_total_kwp from system_size_kwp or projectInfo size
    panel_total_kwp_val := COALESCE(
      NEW.system_size_kwp,
      (project_info->>'size')::NUMERIC,
      NULL
    );
    
    -- Create the project_onboarding record
    INSERT INTO project_onboarding (proposal_id)
    VALUES (NEW.id)
    ON CONFLICT (proposal_id) DO NOTHING
    RETURNING id INTO new_project_id;
    
    -- If we didn't get a project_id (due to conflict), fetch it
    IF new_project_id IS NULL THEN
      SELECT id INTO new_project_id
      FROM project_onboarding
      WHERE proposal_id = NEW.id;
    END IF;
    
    -- Create or update onboarding_fields with pre-populated data
    INSERT INTO onboarding_fields (
      project_id,
      system_address,
      commissioning_date,
      system_name,
      panel_total_kwp
    )
    VALUES (
      new_project_id,
      system_address_val,
      commissioning_date_val,
      system_name_val,
      panel_total_kwp_val
    )
    ON CONFLICT (project_id) DO UPDATE SET
      system_address = COALESCE(EXCLUDED.system_address, onboarding_fields.system_address),
      commissioning_date = COALESCE(EXCLUDED.commissioning_date, onboarding_fields.commissioning_date),
      system_name = COALESCE(EXCLUDED.system_name, onboarding_fields.system_name),
      panel_total_kwp = COALESCE(EXCLUDED.panel_total_kwp, onboarding_fields.panel_total_kwp);
    
  END IF;
  
  RETURN NEW;
END;
$$;