-- Update email address for Fettfarm client
UPDATE clients 
SET email = 'andrew@fettfarm.co.za',
    updated_at = now()
WHERE id = '1290408b-5f1c-4792-ae95-364c1ff9243b';