-- Backfill client_id from linked client records
-- This ensures proposals are visible to users who registered after proposal creation
UPDATE proposals
SET 
  client_id = c.user_id,
  updated_at = now()
FROM clients c
WHERE proposals.client_reference_id = c.id
  AND proposals.client_id IS NULL
  AND c.user_id IS NOT NULL
  AND proposals.deleted_at IS NULL;