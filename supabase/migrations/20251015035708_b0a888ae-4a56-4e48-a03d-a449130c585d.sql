-- Add connection_type and alternative_power_source to onboarding_fields
ALTER TABLE onboarding_fields
ADD COLUMN connection_type TEXT,
ADD COLUMN alternative_power_source TEXT;

-- Add comments for documentation
COMMENT ON COLUMN onboarding_fields.connection_type IS 'Type of connection: Residential Agricultural, Commercial, or Industrial';
COMMENT ON COLUMN onboarding_fields.alternative_power_source IS 'Alternative power source: Eskom or Other';