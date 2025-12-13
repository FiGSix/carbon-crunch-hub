-- Update all Plumari Group (client_company_id) proposals from draft to pending
UPDATE proposals 
SET status = 'pending',
    updated_at = now()
WHERE client_reference_id IN (
  SELECT id FROM clients 
  WHERE client_company_id = 'df61b49c-f971-45a4-a606-4318515c3a75'
)
AND status = 'draft';