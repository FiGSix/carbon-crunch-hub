-- Part 1: Auto-create client records when calculator users sign up
CREATE OR REPLACE FUNCTION public.link_calculator_result_to_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  crunch_carbon_admin_id UUID;
  existing_client_id UUID;
BEGIN
  -- Only process if user_id was just set (calculator user signed up)
  IF OLD.user_id IS NULL AND NEW.user_id IS NOT NULL THEN
    
    -- Get Crunch Carbon admin ID (Shaun)
    SELECT id INTO crunch_carbon_admin_id
    FROM profiles
    WHERE email = 'shaun@crunchcarbon.com' AND role = 'admin'
    LIMIT 1;
    
    -- Check if client already exists for this email
    SELECT id INTO existing_client_id
    FROM clients
    WHERE email = NEW.email
    LIMIT 1;
    
    -- If no existing client record, create one
    IF existing_client_id IS NULL AND crunch_carbon_admin_id IS NOT NULL THEN
      INSERT INTO clients (
        email,
        first_name,
        last_name,
        user_id,
        created_by,
        created_at
      )
      VALUES (
        NEW.email,
        SPLIT_PART(NEW.name, ' ', 1), -- Extract first name
        NULLIF(SUBSTRING(NEW.name FROM POSITION(' ' IN NEW.name) + 1), ''), -- Extract last name
        NEW.user_id,
        crunch_carbon_admin_id,
        NOW()
      );
    ELSIF existing_client_id IS NOT NULL THEN
      -- Update existing client record to link the user_id
      UPDATE clients
      SET user_id = NEW.user_id,
          updated_at = NOW()
      WHERE id = existing_client_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on calculator_results table
DROP TRIGGER IF EXISTS on_calculator_signup ON calculator_results;
CREATE TRIGGER on_calculator_signup
  AFTER UPDATE ON calculator_results
  FOR EACH ROW
  EXECUTE FUNCTION link_calculator_result_to_client();

-- Part 2: Create admin-enhanced function for client listing
CREATE OR REPLACE FUNCTION public.get_agent_clients_paginated_admin(
  agent_id_param uuid DEFAULT NULL,
  limit_param integer DEFAULT 20,
  offset_param integer DEFAULT 0
)
RETURNS TABLE(
  client_id uuid,
  client_name text,
  client_email text,
  company_name text,
  is_registered boolean,
  project_count bigint,
  total_mwp numeric,
  created_at timestamp with time zone,
  agent_company_name text,
  agent_id uuid,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result_ids UUID[];
  result_count INTEGER;
BEGIN
  -- Create temp table for results
  CREATE TEMP TABLE IF NOT EXISTS temp_admin_client_results (
    client_id UUID,
    client_name TEXT,
    client_email TEXT,
    company_name TEXT,
    is_registered BOOLEAN,
    project_count BIGINT,
    total_mwp NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE,
    agent_company_name TEXT,
    agent_id UUID,
    is_active BOOLEAN
  ) ON COMMIT DROP;

  -- Fetch and store results
  INSERT INTO temp_admin_client_results
  WITH client_proposals AS (
    SELECT 
      COALESCE(p.client_reference_id, p.client_id) as client_ref_id,
      p.agent_id,
      COUNT(*) as project_count,
      SUM(COALESCE(p.system_size_kwp, p.annual_energy / 1000.0, 0)) as total_kwp
    FROM proposals p
    WHERE p.deleted_at IS NULL
      AND p.archived_at IS NULL
      AND (agent_id_param IS NULL OR p.agent_id = agent_id_param)
      AND COALESCE(p.client_reference_id, p.client_id) IS NOT NULL
    GROUP BY COALESCE(p.client_reference_id, p.client_id), p.agent_id
  )
  SELECT 
    c.id as client_id,
    TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) as client_name,
    c.email as client_email,
    COALESCE(c.company_name, '') as company_name,
    CASE WHEN c.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_registered,
    COALESCE(cp.project_count, 0) as project_count,
    COALESCE(cp.total_kwp / 1000.0, 0) as total_mwp,
    c.created_at,
    COALESCE(pr.company_name, 'Crunch Carbon') as agent_company_name,
    COALESCE(cp.agent_id, c.created_by) as agent_id,
    CASE 
      WHEN c.user_id IS NOT NULL THEN TRUE  -- Registered users are active
      WHEN cp.project_count > 0 THEN TRUE   -- Has projects means active
      ELSE FALSE                             -- No registration, no projects = inactive
    END as is_active
  FROM clients c
  LEFT JOIN client_proposals cp ON c.id = cp.client_ref_id
  LEFT JOIN profiles pr ON pr.id = COALESCE(cp.agent_id, c.created_by)
  WHERE c.email IS NOT NULL
    AND TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) != ''
    AND (
      agent_id_param IS NULL 
      OR (cp.client_ref_id IS NOT NULL OR c.created_by = agent_id_param)
    )
  ORDER BY client_name
  LIMIT limit_param
  OFFSET offset_param;

  -- Get client IDs for logging
  SELECT ARRAY_AGG(tcr.client_id), COUNT(*)
  INTO result_ids, result_count
  FROM temp_admin_client_results tcr;

  -- Log the access
  PERFORM public.log_client_access(
    'view_list',
    COALESCE(result_ids, ARRAY[]::UUID[]),
    COALESCE(result_count, 0),
    NULL
  );

  -- Return results
  RETURN QUERY
  SELECT * FROM temp_admin_client_results;
END;
$$;