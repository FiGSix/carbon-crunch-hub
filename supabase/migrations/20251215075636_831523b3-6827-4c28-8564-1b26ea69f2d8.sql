-- Update client company name to 'Plumari Group (Pty) Ltd'
UPDATE client_companies 
SET company_name = 'Plumari Group (Pty) Ltd',
    updated_at = NOW()
WHERE id = 'df61b49c-f971-45a4-a606-4318515c3a75';

-- Update clients table company_name for members of this company
UPDATE clients 
SET company_name = 'Plumari Group (Pty) Ltd',
    updated_at = NOW()
WHERE client_company_id = 'df61b49c-f971-45a4-a606-4318515c3a75';

-- Delete the orphan agent company (has no members)
DELETE FROM companies 
WHERE id = '37c7d082-5069-45e1-9da8-796a6894e622';