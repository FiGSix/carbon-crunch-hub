-- Fix 533 draft proposals for Marius van Rensburg and Laurent Pieton to pending status
-- This allows them to accept/decline their proposals immediately

UPDATE proposals 
SET status = 'pending',
    updated_at = now()
WHERE client_reference_id IN (
  SELECT id FROM clients 
  WHERE lower(email) IN ('marius@vinte.co.za', 'laurent@metrowatt.co.za')
)
AND status = 'draft'
AND deleted_at IS NULL;