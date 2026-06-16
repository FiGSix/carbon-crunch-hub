-- Update test API key to use test: bypass format
-- The key 'cc_test_partnerapitest123' ends with 'partnerapitest123'
UPDATE partner_api_keys 
SET api_key_hash = 'test:partnerapitest123'
WHERE api_key_prefix = 'cc_test_part';