-- Fix search_path for client team functions
CREATE OR REPLACE FUNCTION public.is_current_user_client_account_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_company_members
    WHERE user_id = auth.uid()
      AND role = 'account_admin'
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.user_client_company_ids(user_id_param UUID)
RETURNS TABLE(client_company_id UUID)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ccm.client_company_id
  FROM public.client_company_members ccm
  WHERE ccm.user_id = user_id_param 
    AND ccm.status = 'active';
$$;