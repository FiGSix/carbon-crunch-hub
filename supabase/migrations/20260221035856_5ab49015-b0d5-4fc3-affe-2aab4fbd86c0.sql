
-- Create regional_solar_yields table
CREATE TABLE public.regional_solar_yields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  province text UNIQUE NOT NULL,
  yield_kwh_per_kwp numeric NOT NULL,
  source text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.regional_solar_yields ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
CREATE POLICY "Authenticated users can read solar yields"
ON public.regional_solar_yields
FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert solar yields"
ON public.regional_solar_yields
FOR INSERT
TO authenticated
WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can update solar yields"
ON public.regional_solar_yields
FOR UPDATE
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can delete solar yields"
ON public.regional_solar_yields
FOR DELETE
TO authenticated
USING (public.is_current_user_admin());

-- Seed data
INSERT INTO public.regional_solar_yields (province, yield_kwh_per_kwp, source) VALUES
  ('Northern Cape', 1800, 'Published SA solar irradiance data'),
  ('Free State', 1750, 'Published SA solar irradiance data'),
  ('North West', 1720, 'Published SA solar irradiance data'),
  ('Limpopo', 1680, 'Published SA solar irradiance data'),
  ('Mpumalanga', 1620, 'Published SA solar irradiance data'),
  ('Gauteng', 1650, 'Published SA solar irradiance data'),
  ('Eastern Cape', 1580, 'Published SA solar irradiance data'),
  ('KwaZulu-Natal', 1520, 'Published SA solar irradiance data'),
  ('Western Cape', 1600, 'Published SA solar irradiance data');
