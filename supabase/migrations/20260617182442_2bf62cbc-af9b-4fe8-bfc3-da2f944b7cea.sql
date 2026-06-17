CREATE OR REPLACE FUNCTION public.sync_super_partner_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.super_partner_status = 'suspended' THEN
    IF NEW.role = 'super_partner' THEN
      UPDATE public.profiles SET role = 'agent' WHERE id = NEW.id;
      NEW.role := 'agent';
    END IF;
    DELETE FROM public.user_roles
      WHERE user_id = NEW.id AND role = 'super_partner';
    INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'agent')
      ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF NEW.super_partner_status = 'active' THEN
    IF NEW.role IS DISTINCT FROM 'super_partner' THEN
      UPDATE public.profiles SET role = 'super_partner' WHERE id = NEW.id;
      NEW.role := 'super_partner';
    END IF;
    INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'super_partner')
      ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_super_partner_status_trg ON public.profiles;
CREATE TRIGGER sync_super_partner_status_trg
AFTER INSERT OR UPDATE OF super_partner_status ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_super_partner_status();