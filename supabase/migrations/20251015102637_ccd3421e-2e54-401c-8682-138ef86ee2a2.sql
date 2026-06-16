-- Add panel_total_kwp column to onboarding_fields table
ALTER TABLE onboarding_fields
ADD COLUMN IF NOT EXISTS panel_total_kwp NUMERIC;