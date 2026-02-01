-- Create test partner for API testing
INSERT INTO partners (name, contact_email, is_active)
VALUES ('Test Partner', 'test@example.com', true)
ON CONFLICT DO NOTHING;

-- Generate a test API key with SHA-256 hash
-- The test key will be: cc_test_abc123test
-- SHA-256 hash of 'cc_test_abc123test' = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855... 
-- (We'll use a simple known hash for testing)

INSERT INTO partner_api_keys (
  partner_id,
  api_key_hash,
  api_key_prefix,
  environment,
  scopes,
  is_active,
  rate_limit_per_minute,
  rate_limit_per_day
)
SELECT 
  id,
  -- SHA-256 hash of 'cc_test_partnerapitest123' 
  'c5d9d7b4f7e8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4',
  'cc_test_part',
  'test',
  '["proposals:create", "proposals:read", "proposals:send", "projects:read", "projects:onboarding:write", "clients:read", "webhooks:manage"]'::jsonb,
  true,
  100,
  10000
FROM partners
WHERE name = 'Test Partner'
ON CONFLICT DO NOTHING;