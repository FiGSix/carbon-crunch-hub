-- Drop and recreate get_agent_by_email to include commission_override
DROP FUNCTION IF EXISTS public.get_agent_by_email(text);

CREATE FUNCTION public.get_agent_by_email(email_param text)
RETURNS TABLE(
  id uuid,
  email text,
  first_name text,
  last_name text,
  agent_status text,
  commission_override numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.agent_status,
    p.commission_override
  FROM public.profiles p
  WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(email_param))
    AND p.deleted_at IS NULL
    AND EXISTS (
      SELECT 1 
      FROM public.user_roles ur
      WHERE ur.user_id = p.id 
        AND ur.role IN ('agent', 'admin')
    );
END;
$function$;

-- Backfill existing proposals for Crunch Carbon internal staff with commission override
UPDATE proposals
SET agent_commission_percentage = p.commission_override
FROM profiles p
WHERE proposals.agent_id = p.id
  AND p.commission_override IS NOT NULL
  AND p.commission_override = 0
  AND proposals.agent_commission_percentage IN (4, 5)
  AND proposals.deleted_at IS NULL;