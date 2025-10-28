-- =====================================================
-- RPC Function: find_or_create_client_by_email
-- Purpose: Atomically find or create client, bypassing RLS
-- Security: SECURITY DEFINER with minimal scope
-- =====================================================

CREATE OR REPLACE FUNCTION public.find_or_create_client_by_email(
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone TEXT,
  p_company_name TEXT,
  p_created_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_normalized_email TEXT;
BEGIN
  -- Validate inputs
  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'Email cannot be empty';
  END IF;
  
  IF p_created_by IS NULL THEN
    RAISE EXCEPTION 'created_by cannot be null';
  END IF;
  
  -- Normalize email (case-insensitive, trimmed)
  v_normalized_email := LOWER(TRIM(p_email));
  
  -- Try to find existing client (bypasses RLS)
  SELECT id INTO v_client_id
  FROM clients
  WHERE LOWER(email) = v_normalized_email
  LIMIT 1;
  
  -- If found, return existing client ID
  IF v_client_id IS NOT NULL THEN
    RETURN v_client_id;
  END IF;
  
  -- Otherwise, create new client record
  INSERT INTO clients (
    email,
    first_name,
    last_name,
    phone,
    company_name,
    created_by,
    created_at
  )
  VALUES (
    v_normalized_email,
    p_first_name,
    p_last_name,
    p_phone,
    p_company_name,
    p_created_by,
    NOW()
  )
  RETURNING id INTO v_client_id;
  
  RETURN v_client_id;
  
EXCEPTION
  WHEN unique_violation THEN
    -- Race condition: another process created the client between SELECT and INSERT
    -- Retry the SELECT to get the ID
    SELECT id INTO v_client_id
    FROM clients
    WHERE LOWER(email) = v_normalized_email
    LIMIT 1;
    
    IF v_client_id IS NULL THEN
      RAISE EXCEPTION 'Unable to find or create client for email: %. This should not happen.', p_email;
    END IF;
    
    RETURN v_client_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.find_or_create_client_by_email TO authenticated;

-- Add documentation
COMMENT ON FUNCTION public.find_or_create_client_by_email IS 
'Atomically finds or creates a client by email address, bypassing RLS for lookup. 
This enables multi-agent scenarios where multiple agents create proposals for the same client.
The function uses SECURITY DEFINER to bypass RLS only for the email lookup operation.
Audit trail is preserved via created_by field.';