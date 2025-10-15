-- Add data collector/dongle fields to onboarding_fields table
ALTER TABLE public.onboarding_fields 
ADD COLUMN data_collector_present TEXT,
ADD COLUMN data_collector_serial TEXT;