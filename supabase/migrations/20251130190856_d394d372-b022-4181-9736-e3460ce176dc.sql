-- Add cession master agreement tracking columns to clients table
ALTER TABLE clients 
  ADD COLUMN cession_signed_at TIMESTAMPTZ,
  ADD COLUMN first_agreement_id UUID REFERENCES proposal_agreements(id);

-- Add index for faster lookups
CREATE INDEX idx_clients_cession_signed_at ON clients(cession_signed_at) WHERE cession_signed_at IS NOT NULL;

-- Backfill existing data: Set cession_signed_at for clients who have already signed
UPDATE clients c
SET 
  cession_signed_at = subquery.first_signed,
  first_agreement_id = subquery.first_agreement_id
FROM (
  SELECT DISTINCT ON (p.client_reference_id)
    p.client_reference_id,
    pa.signed_at as first_signed,
    pa.id as first_agreement_id
  FROM proposal_agreements pa
  JOIN proposals p ON p.id = pa.proposal_id
  WHERE p.client_reference_id IS NOT NULL
    AND pa.signed_at IS NOT NULL
  ORDER BY p.client_reference_id, pa.signed_at ASC
) subquery
WHERE c.id = subquery.client_reference_id;