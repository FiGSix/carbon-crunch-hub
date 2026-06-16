-- Add has_maintenance_agreement field to onboarding_fields table
ALTER TABLE public.onboarding_fields
ADD COLUMN has_maintenance_agreement BOOLEAN NULL;