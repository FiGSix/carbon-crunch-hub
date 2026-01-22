-- Generate invitation tokens for existing draft/pending proposals that are missing them
UPDATE proposals
SET 
  invitation_token = REPLACE(gen_random_uuid()::text, '-', '') || 
                     REPLACE(gen_random_uuid()::text, '-', ''),
  invitation_expires_at = NOW() + INTERVAL '10 days'
WHERE status IN ('draft', 'pending')
  AND (invitation_token IS NULL OR invitation_expires_at IS NULL);