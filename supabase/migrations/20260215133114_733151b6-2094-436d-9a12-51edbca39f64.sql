UPDATE partner_api_keys 
SET scopes = '["proposals:create", "proposals:read", "projects:read", "projects:onboarding:write", "projects:onboarding:read", "projects:documents:write", "projects:data-access:write"]'::jsonb
WHERE id = '7b3b3349-b3d1-4666-8596-04a25632133b';