-- Add proposal_id column to calculator_results
ALTER TABLE calculator_results 
ADD COLUMN proposal_id uuid REFERENCES proposals(id);

-- Create function to convert calculator result to draft proposal
CREATE OR REPLACE FUNCTION public.create_proposal_from_calculator_result(
  calculator_result_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_calculator_result calculator_results%ROWTYPE;
  v_client_record clients%ROWTYPE;
  v_admin_agent_id uuid;
  v_proposal_id uuid;
  v_project_info jsonb;
BEGIN
  -- Fetch calculator result
  SELECT * INTO v_calculator_result
  FROM calculator_results
  WHERE id = calculator_result_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Calculator result not found';
  END IF;

  -- Check if already converted
  IF v_calculator_result.proposal_id IS NOT NULL THEN
    RETURN v_calculator_result.proposal_id;
  END IF;

  -- Find client record
  SELECT * INTO v_client_record
  FROM clients
  WHERE user_id = v_calculator_result.user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client record not found';
  END IF;

  -- Get an admin user as the agent (Crunch Carbon admin)
  SELECT id INTO v_admin_agent_id
  FROM profiles
  WHERE role = 'admin'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_admin_agent_id IS NULL THEN
    RAISE EXCEPTION 'No admin agent found';
  END IF;

  -- Build project info from calculator data
  v_project_info := jsonb_build_object(
    'systemSize', v_calculator_result.system_size_kwp,
    'commissioningDate', v_calculator_result.commissioning_date,
    'clientName', v_calculator_result.name,
    'clientEmail', v_calculator_result.email,
    'source', 'calculator'
  );

  -- Create draft proposal
  INSERT INTO proposals (
    title,
    status,
    system_size_kwp,
    client_reference_id,
    agent_id,
    project_info,
    content,
    created_at
  ) VALUES (
    'Solar Project - ' || v_calculator_result.system_size_kwp || ' kWp',
    'draft',
    v_calculator_result.system_size_kwp,
    v_client_record.id,
    v_admin_agent_id,
    v_project_info,
    jsonb_build_object(
      'projectInfo', v_project_info
    ),
    now()
  )
  RETURNING id INTO v_proposal_id;

  -- Update calculator_results with proposal_id
  UPDATE calculator_results
  SET proposal_id = v_proposal_id
  WHERE id = calculator_result_id;

  -- Log activity
  INSERT INTO agent_activities (
    agent_id,
    activity_type,
    activity_data
  ) VALUES (
    v_admin_agent_id,
    'proposal_created_from_calculator',
    jsonb_build_object(
      'proposal_id', v_proposal_id,
      'calculator_result_id', calculator_result_id,
      'system_size_kwp', v_calculator_result.system_size_kwp
    )
  );

  RETURN v_proposal_id;
END;
$$;

-- Update the trigger function to auto-create proposal
CREATE OR REPLACE FUNCTION public.link_calculator_result_to_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_proposal_id uuid;
  v_name_parts text[];
  v_last_name text;
BEGIN
  -- Find or create client record
  SELECT id INTO v_client_id
  FROM clients
  WHERE user_id = NEW.user_id
  LIMIT 1;

  IF v_client_id IS NULL THEN
    -- Parse name into first and last name
    v_name_parts := string_to_array(NEW.name, ' ');
    v_last_name := '';
    
    IF array_length(v_name_parts, 1) > 1 THEN
      -- Join all parts after the first as last name
      FOR i IN 2..array_length(v_name_parts, 1) LOOP
        IF i > 2 THEN
          v_last_name := v_last_name || ' ';
        END IF;
        v_last_name := v_last_name || v_name_parts[i];
      END LOOP;
    END IF;

    -- Create new client record
    INSERT INTO clients (
      user_id,
      email,
      first_name,
      last_name,
      created_at
    ) VALUES (
      NEW.user_id,
      NEW.email,
      v_name_parts[1],
      v_last_name,
      now()
    )
    RETURNING id INTO v_client_id;
  END IF;

  -- Auto-create proposal from calculator result
  IF NEW.proposal_id IS NULL THEN
    BEGIN
      v_proposal_id := create_proposal_from_calculator_result(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the update
      RAISE WARNING 'Failed to create proposal from calculator result %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;