-- Create a version of find_or_create_client_by_email that works for Partner API
-- Partner API doesn't have an agent - uses partner_id for tracking
CREATE OR REPLACE FUNCTION public.find_or_create_client_for_partner_api(
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone TEXT,
  p_company_name TEXT,
  p_partner_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id UUID;
  v_normalized_email TEXT;
BEGIN
  -- Validate inputs
  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'Email cannot be empty';
  END IF;
  
  IF p_partner_id IS NULL THEN
    RAISE EXCEPTION 'partner_id cannot be null';
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
  
  -- Otherwise, create new client record (no agent, created via Partner API)
  INSERT INTO clients (
    email,
    first_name,
    last_name,
    phone,
    company_name,
    created_by,  -- NULL for API-created clients
    created_at,
    notes
  )
  VALUES (
    v_normalized_email,
    p_first_name,
    p_last_name,
    p_phone,
    p_company_name,
    NULL,  -- No agent creator
    NOW(),
    'Created via Partner API (partner_id: ' || p_partner_id::text || ')'
  )
  RETURNING id INTO v_client_id;
  
  RETURN v_client_id;
  
EXCEPTION
  WHEN unique_violation THEN
    -- Race condition: another process created the client between SELECT and INSERT
    SELECT id INTO v_client_id
    FROM clients
    WHERE LOWER(email) = v_normalized_email
    LIMIT 1;
    
    IF v_client_id IS NULL THEN
      RAISE EXCEPTION 'Unable to find or create client for email: %', p_email;
    END IF;
    
    RETURN v_client_id;
END;
$$;