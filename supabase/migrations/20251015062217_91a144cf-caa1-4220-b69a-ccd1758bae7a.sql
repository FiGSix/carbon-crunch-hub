-- Add inverter_brand column to onboarding_fields table
ALTER TABLE public.onboarding_fields 
ADD COLUMN inverter_brand TEXT;