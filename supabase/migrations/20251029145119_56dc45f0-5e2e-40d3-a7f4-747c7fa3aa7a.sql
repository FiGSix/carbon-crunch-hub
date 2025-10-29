-- Fix search path security warning by recreating function with explicit search_path
-- First drop the dependent trigger
DROP TRIGGER IF EXISTS on_user_created_link_calculator_results ON auth.users;

-- Then drop and recreate the function with explicit search_path
DROP FUNCTION IF EXISTS link_calculator_result_to_user();

CREATE OR REPLACE FUNCTION link_calculator_result_to_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = 'public'
LANGUAGE plpgsql
AS $$
BEGIN
  -- Link any calculator results with matching email to the new user
  UPDATE public.calculator_results
  SET user_id = NEW.id
  WHERE email = NEW.email
  AND user_id IS NULL;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_user_created_link_calculator_results
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION link_calculator_result_to_user();