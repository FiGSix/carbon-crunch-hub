-- Link Mohamed Madhi's client record to Sinan Energy company
UPDATE clients
SET 
  client_company_id = 'd4d29a3a-4ad5-4a44-91b0-3008597f95f8',
  updated_at = now()
WHERE id = '53c7cf66-e254-42b0-93f9-cc5c9fac2423'
  AND client_company_id IS NULL;