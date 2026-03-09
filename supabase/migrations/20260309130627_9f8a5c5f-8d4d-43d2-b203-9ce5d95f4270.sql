-- Clean up 6 orphaned duplicate agreement records for Keystone proposal
-- Keep only the most recent one (8cc8287d)
DELETE FROM proposal_agreements 
WHERE proposal_id = '47d928bc-4726-4520-b792-4e7f01548ab2' 
AND id != '8cc8287d-9070-42ef-977e-69605fc614e1';