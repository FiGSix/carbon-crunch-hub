
-- Table
CREATE TABLE public.carbon_rate_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  prices jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.carbon_rate_sets TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.carbon_rate_sets TO authenticated;
GRANT ALL ON public.carbon_rate_sets TO service_role;

ALTER TABLE public.carbon_rate_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read rate sets"
  ON public.carbon_rate_sets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert rate sets"
  ON public.carbon_rate_sets FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update rate sets"
  ON public.carbon_rate_sets FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete non-default rate sets"
  ON public.carbon_rate_sets FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND is_default = false);

-- updated_at trigger
CREATE TRIGGER update_carbon_rate_sets_updated_at
  BEFORE UPDATE ON public.carbon_rate_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure only one default
CREATE OR REPLACE FUNCTION public.enforce_single_default_carbon_rate_set()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.carbon_rate_sets
      SET is_default = false
      WHERE id <> NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_single_default_carbon_rate_set
  AFTER INSERT OR UPDATE OF is_default ON public.carbon_rate_sets
  FOR EACH ROW WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.enforce_single_default_carbon_rate_set();

-- Client link column
ALTER TABLE public.clients
  ADD COLUMN carbon_rate_set_id uuid REFERENCES public.carbon_rate_sets(id) ON DELETE SET NULL;

CREATE INDEX idx_clients_carbon_rate_set_id ON public.clients(carbon_rate_set_id);

-- Seed default from existing system_settings.carbon_prices
INSERT INTO public.carbon_rate_sets (name, prices, is_default)
SELECT 'Default',
       COALESCE(setting_value, '{}'::jsonb),
       true
FROM public.system_settings
WHERE setting_key = 'carbon_prices'
LIMIT 1;

-- Fallback if system_settings row does not exist
INSERT INTO public.carbon_rate_sets (name, prices, is_default)
SELECT 'Default', '{}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.carbon_rate_sets WHERE name = 'Default');
