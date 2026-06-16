-- Update user_company_ids function to use empty search_path with fully qualified names
CREATE OR REPLACE FUNCTION public.user_company_ids(user_id_param UUID)
RETURNS TABLE(company_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT DISTINCT cm.company_id
  FROM public.company_members cm
  WHERE cm.user_id = user_id_param 
    AND cm.status = 'active';
$$;