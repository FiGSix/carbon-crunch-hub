-- Add documents and data access scopes to test API key
UPDATE partner_api_keys
SET scopes = '["proposals:create", "proposals:read", "proposals:send", "projects:read", "projects:onboarding:write", "projects:documents:write", "projects:data_access:write", "clients:read", "webhooks:manage"]'::jsonb
WHERE api_key_prefix = 'cc_test_part';