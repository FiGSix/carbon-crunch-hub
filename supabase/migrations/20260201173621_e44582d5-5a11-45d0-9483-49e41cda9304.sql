-- Create project_onboarding record for the test proposal to simulate signing
INSERT INTO project_onboarding (
  id,
  proposal_id,
  onboarding_complete,
  submitted_for_review,
  admin_validated,
  audit_ready,
  data_access_verified,
  version
)
SELECT 
  gen_random_uuid(),
  'f51f1473-f5ae-4083-abfd-19970d82b9f2',
  false,
  false,
  false,
  false,
  false,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM project_onboarding WHERE proposal_id = 'f51f1473-f5ae-4083-abfd-19970d82b9f2'
);

-- Update the proposal to 'accepted' status to simulate signing
UPDATE proposals 
SET status = 'accepted', signed_at = NOW()
WHERE id = 'f51f1473-f5ae-4083-abfd-19970d82b9f2';

-- Create onboarding_fields record for the project
INSERT INTO onboarding_fields (
  id,
  project_id,
  system_address,
  commissioning_date,
  panel_total_kwp
)
SELECT 
  gen_random_uuid(),
  po.id,
  '456 Test Street, Cape Town',
  '2025-06-15',
  150
FROM project_onboarding po
WHERE po.proposal_id = 'f51f1473-f5ae-4083-abfd-19970d82b9f2'
  AND NOT EXISTS (
    SELECT 1 FROM onboarding_fields WHERE project_id = po.id
  );