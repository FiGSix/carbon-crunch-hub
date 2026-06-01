
CREATE TABLE public.inverter_portal_defaults (
  brand text PRIMARY KEY,
  portal_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.inverter_portal_defaults TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.inverter_portal_defaults TO authenticated;
GRANT ALL ON public.inverter_portal_defaults TO service_role;

ALTER TABLE public.inverter_portal_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read inverter portal defaults"
ON public.inverter_portal_defaults FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert inverter portal defaults"
ON public.inverter_portal_defaults FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update inverter portal defaults"
ON public.inverter_portal_defaults FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete inverter portal defaults"
ON public.inverter_portal_defaults FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_inverter_portal_defaults_updated_at
BEFORE UPDATE ON public.inverter_portal_defaults
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.inverter_portal_defaults (brand, portal_url) VALUES
  ('ABB', NULL),
  ('Afore', NULL),
  ('Alpha ESS', 'https://www.alphaess.com'),
  ('Ario', NULL),
  ('Atess', NULL),
  ('BlueLog', NULL),
  ('Deye', 'https://www.solarmanpv.com'),
  ('Dyness', NULL),
  ('Enphase', 'https://enlighten.enphaseenergy.com'),
  ('FoxESS', 'https://www.foxesscloud.com'),
  ('Fronius', 'https://www.solarweb.com'),
  ('GivEnergy', 'https://www.givenergy.cloud'),
  ('GoodWe', 'https://www.semsportal.com'),
  ('Growatt', 'https://server.growatt.com'),
  ('Huawei', 'https://eu5.fusionsolar.huawei.com'),
  ('Lux', NULL),
  ('Megarevo', NULL),
  ('Meteo Control', NULL),
  ('SigEnergy', NULL),
  ('Sineng', NULL),
  ('Sivula', NULL),
  ('SMA', 'https://ennexos.sunnyportal.com'),
  ('Solis', 'https://www.soliscloud.com'),
  ('SolarEdge', 'https://monitoring.solaredge.com'),
  ('Sungrow', 'https://www.isolarcloud.com'),
  ('SunSynk', 'https://www.sunsynk.net'),
  ('Vcomms', NULL),
  ('Victron', 'https://vrm.victronenergy.com')
ON CONFLICT (brand) DO NOTHING;
