-- Ensure proposal_id column exists in calculator_results
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calculator_results' AND column_name = 'proposal_id'
  ) THEN
    ALTER TABLE calculator_results ADD COLUMN proposal_id uuid REFERENCES proposals(id);
  END IF;
END $$;

-- Drop existing function if exists
DROP FUNCTION IF EXISTS create_proposal_from_calculator_result(uuid);

-- Function to create proposal from calculator result
CREATE FUNCTION create_proposal_from_calculator_result(
  p_calculator_result_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_proposal_id uuid;
  v_user_id uuid;
  v_client_id uuid;
  v_system_size numeric;
  v_commissioning_date date;
  v_email text;
  v_name text;
  v_first_name text;
  v_last_name text;
  v_admin_id uuid;
BEGIN
  -- Get calculator result data
  SELECT user_id, system_size_kwp, commissioning_date, email, name
  INTO v_user_id, v_system_size, v_commissioning_date, v_email, v_name
  FROM calculator_results
  WHERE id = p_calculator_result_id;

  IF v_user_id IS NULL THEN
    RAISE WARNING 'Calculator result % has no user_id', p_calculator_result_id;
    RETURN NULL;
  END IF;

  -- Parse name into first_name and last_name
  IF v_name IS NOT NULL AND trim(v_name) != '' THEN
    v_first_name := split_part(v_name, ' ', 1);
    v_last_name := trim(substring(v_name from position(' ' in v_name)));
    
    IF v_last_name = '' THEN
      v_last_name := NULL;
    END IF;
  END IF;

  -- Get or create client record
  SELECT id INTO v_client_id
  FROM clients
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO clients (
      user_id,
      email,
      first_name,
      last_name,
      created_by
    ) VALUES (
      v_user_id,
      v_email,
      v_first_name,
      v_last_name,
      v_user_id
    )
    RETURNING id INTO v_client_id;
  END IF;

  -- Get admin user
  SELECT id INTO v_admin_id
  FROM profiles
  WHERE role = 'admin'
  LIMIT 1;

  -- Create proposal
  INSERT INTO proposals (
    title,
    status,
    agent_id,
    client_reference_id,
    system_size_kwp,
    project_info,
    content,
    eligibility_criteria,
    created_at
  ) VALUES (
    'Solar Project - ' || v_system_size || ' kWp',
    'draft',
    v_admin_id,
    v_client_id,
    v_system_size,
    jsonb_build_object(
      'systemSize', v_system_size,
      'commissioningDate', v_commissioning_date
    ),
    jsonb_build_object(
      'clientInformation', jsonb_build_object(
        'name', v_name,
        'email', v_email
      ),
      'projectInformation', jsonb_build_object(
        'systemSize', v_system_size,
        'commissioningDate', v_commissioning_date
      )
    ),
    jsonb_build_object(),
    now()
  )
  RETURNING id INTO v_proposal_id;

  -- Link proposal to calculator result
  UPDATE calculator_results
  SET proposal_id = v_proposal_id
  WHERE id = p_calculator_result_id;

  RETURN v_proposal_id;
END;
$$;

-- Fixed trigger function
CREATE OR REPLACE FUNCTION link_calculator_result_to_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id uuid;
  v_first_name text;
  v_last_name text;
  v_proposal_id uuid;
BEGIN
  -- Only process when user_id changes from NULL to a value
  IF OLD.user_id IS NULL AND NEW.user_id IS NOT NULL THEN
    
    -- Parse name
    IF NEW.name IS NOT NULL AND trim(NEW.name) != '' THEN
      v_first_name := split_part(NEW.name, ' ', 1);
      v_last_name := trim(substring(NEW.name from position(' ' in NEW.name)));
      
      IF v_last_name = '' THEN
        v_last_name := NULL;
      END IF;
    END IF;

    -- Get or create client
    SELECT id INTO v_client_id
    FROM clients
    WHERE user_id = NEW.user_id
    LIMIT 1;

    IF v_client_id IS NULL THEN
      BEGIN
        INSERT INTO clients (
          user_id,
          email,
          first_name,
          last_name,
          created_by
        ) VALUES (
          NEW.user_id,
          NEW.email,
          v_first_name,
          v_last_name,
          NEW.user_id
        )
        RETURNING id INTO v_client_id;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to create client for calculator result %: %', NEW.id, SQLERRM;
      END;
    END IF;

    -- Create proposal
    BEGIN
      v_proposal_id := create_proposal_from_calculator_result(NEW.id);
      
      IF v_proposal_id IS NOT NULL THEN
        NEW.proposal_id := v_proposal_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create proposal for calculator result %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS after_calculator_result_user_linked ON calculator_results;

CREATE TRIGGER after_calculator_result_user_linked
BEFORE UPDATE ON calculator_results
FOR EACH ROW
EXECUTE FUNCTION link_calculator_result_to_client();