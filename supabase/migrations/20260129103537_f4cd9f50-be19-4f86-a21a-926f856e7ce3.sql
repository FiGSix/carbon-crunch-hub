-- Add has_battery boolean column to onboarding_fields
ALTER TABLE onboarding_fields 
ADD COLUMN has_battery boolean DEFAULT NULL;