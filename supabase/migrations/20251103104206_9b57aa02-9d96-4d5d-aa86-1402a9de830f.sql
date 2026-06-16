-- Drop the orphaned trigger that's breaking user registration
DROP TRIGGER IF EXISTS on_user_created_link_calculator_results ON auth.users;

-- Drop the orphaned function that references the deleted calculator_results table
DROP FUNCTION IF EXISTS link_calculator_result_to_user();