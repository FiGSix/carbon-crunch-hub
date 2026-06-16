-- Add system_name and ownership_type to onboarding_fields
ALTER TABLE onboarding_fields
ADD COLUMN system_name TEXT,
ADD COLUMN ownership_type TEXT;

-- Add comment for documentation
COMMENT ON COLUMN onboarding_fields.system_name IS 'Name/identifier for the solar system';
COMMENT ON COLUMN onboarding_fields.ownership_type IS 'Ownership type: Authorised Representative, Owner, or Financed';