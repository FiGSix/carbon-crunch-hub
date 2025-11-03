-- Drop the triggers first
DROP TRIGGER IF EXISTS after_calculator_result_user_linked ON calculator_results;
DROP TRIGGER IF EXISTS on_calculator_signup ON calculator_results;

-- Drop the trigger function
DROP FUNCTION IF EXISTS link_calculator_result_to_client();

-- Drop the RPC function used by backfill
DROP FUNCTION IF EXISTS create_proposal_from_calculator_result(uuid);

-- Drop the calculator_results table (CASCADE to remove any foreign keys)
DROP TABLE IF EXISTS calculator_results CASCADE;