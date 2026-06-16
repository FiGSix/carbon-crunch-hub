-- Backfill clients.user_id from profiles by matching email (case-insensitive, trimmed)
-- This fixes proposal visibility for clients under RLS via is_proposal_client()
UPDATE public.clients c
SET user_id = p.id,
    updated_at = now()
FROM public.profiles p
WHERE c.user_id IS NULL
  AND c.email IS NOT NULL AND c.email <> ''
  AND lower(trim(c.email)) = lower(trim(p.email))
  AND p.role = 'client'
  AND p.id = (
    -- Pick the first profile ID for duplicate emails (deterministic order)
    SELECT id 
    FROM public.profiles 
    WHERE lower(trim(email)) = lower(trim(c.email)) 
      AND role = 'client'
    ORDER BY created_at ASC
    LIMIT 1
  );