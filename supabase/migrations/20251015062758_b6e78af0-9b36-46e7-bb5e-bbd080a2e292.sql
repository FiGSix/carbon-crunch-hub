-- Add inverter_quantity column to onboarding_fields table
ALTER TABLE public.onboarding_fields 
ADD COLUMN inverter_quantity INTEGER;