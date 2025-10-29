-- Add user_id to calculator_results to link authenticated users
ALTER TABLE calculator_results
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create index for performance
CREATE INDEX idx_calculator_results_user_id ON calculator_results(user_id);

-- Update RLS policy to allow users to see their own results
CREATE POLICY "calculator_results_user_view" ON calculator_results
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR is_current_user_admin()
  );

-- Function to automatically link calculator results when user signs up with matching email
CREATE OR REPLACE FUNCTION link_calculator_result_to_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Link any calculator results with matching email to the new user
  UPDATE calculator_results
  SET user_id = NEW.id
  WHERE email = NEW.email
  AND user_id IS NULL;
  
  RETURN NEW;
END;
$$;

-- Trigger to run the function when a new user is created
CREATE TRIGGER on_user_created_link_calculator_results
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION link_calculator_result_to_user();