-- Migration: Sync agent_status in auth.users to match profiles
-- Purpose: Fix legacy mismatch where profiles.agent_status = 'active' 
--          but auth.users.raw_user_meta_data.agent_status != 'active'

UPDATE auth.users u
SET raw_user_meta_data = 
  COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"agent_status": "active"}'::jsonb
FROM public.profiles p
WHERE u.id = p.id
  AND p.role = 'agent'
  AND p.agent_status = 'active'
  AND (
    u.raw_user_meta_data->>'agent_status' IS NULL 
    OR u.raw_user_meta_data->>'agent_status' != 'active'
  );