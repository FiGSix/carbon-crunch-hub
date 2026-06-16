-- Add unique constraint on company_name
ALTER TABLE public.solar_installers 
ADD CONSTRAINT solar_installers_company_name_key UNIQUE (company_name);

-- Insert default EPC/Solar Installer companies
INSERT INTO public.solar_installers (company_name, email, created_at, updated_at)
VALUES 
  ('Sinani Energy', NULL, now(), now()),
  ('Nuvo Energy', NULL, now(), now()),
  ('Oryx Renewables', NULL, now(), now()),
  ('1Energy', NULL, now(), now()),
  ('All Solar Vryheid', NULL, now(), now()),
  ('Deo Solar CC', NULL, now(), now()),
  ('Grid Capital', NULL, now(), now()),
  ('GridVolt', NULL, now(), now()),
  ('Infoled', NULL, now(), now())
ON CONFLICT (company_name) DO NOTHING;