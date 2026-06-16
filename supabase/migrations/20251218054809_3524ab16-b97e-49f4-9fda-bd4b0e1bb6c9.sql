-- Fix corrupted client record where project name was entered as client name
UPDATE clients 
SET 
  first_name = 'Craig',
  last_name = 'Scott',
  updated_at = now()
WHERE id = '0692a615-70c9-4a11-b4c9-7286e47279f7'
  AND email = 'craig@gridvolt.co.za';