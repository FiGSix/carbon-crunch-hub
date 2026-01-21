-- Create RPC function to calculate minimum vintage year on server
-- This ensures consistent results across all users regardless of browser timezone

CREATE OR REPLACE FUNCTION get_minimum_vintage_year()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deadlines jsonb;
  year_key text;
  deadline_value timestamptz;
  current_year integer := EXTRACT(YEAR FROM NOW())::integer;
BEGIN
  -- Get vintage deadlines from system settings
  SELECT setting_value INTO deadlines
  FROM system_settings
  WHERE setting_key = 'vintage_deadlines';
  
  IF deadlines IS NULL THEN
    RETURN current_year;
  END IF;
  
  -- Check each deadline to find earliest open year
  FOR year_key IN SELECT jsonb_object_keys(deadlines)
  LOOP
    deadline_value := (deadlines->>year_key)::timestamptz;
    
    -- If deadline is in the future and year < current year, return that year
    IF deadline_value > NOW() AND year_key::integer < current_year THEN
      RETURN year_key::integer;
    END IF;
  END LOOP;
  
  -- Default to current year if no earlier vintage is open
  RETURN current_year;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_minimum_vintage_year() TO authenticated;

-- Add a comment explaining the function
COMMENT ON FUNCTION get_minimum_vintage_year() IS 'Returns the minimum vintage year that is still open for submissions. Uses server time to ensure consistent results across all users.';