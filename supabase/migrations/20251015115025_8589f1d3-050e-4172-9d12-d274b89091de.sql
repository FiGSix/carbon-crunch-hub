-- Create table for solar installers/EPCs
CREATE TABLE IF NOT EXISTS public.solar_installers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  contact_person TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.solar_installers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for solar_installers
CREATE POLICY "Users can view all installers"
ON public.solar_installers
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert installers"
ON public.solar_installers
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update installers they created or admins"
ON public.solar_installers
FOR UPDATE
USING (created_by = auth.uid() OR is_current_user_admin());

-- Add installer fields to onboarding_fields
ALTER TABLE public.onboarding_fields
ADD COLUMN IF NOT EXISTS installer_id UUID REFERENCES public.solar_installers(id),
ADD COLUMN IF NOT EXISTS installer_company_name TEXT,
ADD COLUMN IF NOT EXISTS installer_email TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_solar_installers_company_name ON public.solar_installers(company_name);
CREATE INDEX IF NOT EXISTS idx_onboarding_fields_installer_id ON public.onboarding_fields(installer_id);