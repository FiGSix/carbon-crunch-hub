-- Fix log_client_access to handle NULL auth.uid() gracefully
-- This prevents the client table from breaking when auth context is unavailable

CREATE OR REPLACE FUNCTION public.log_client_access(
  action_param TEXT,
  client_ids_param UUID[],
  result_count_param INTEGER DEFAULT 0,
  search_term_param TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Only log if we have a valid user ID
  IF current_user_id IS NOT NULL THEN
    INSERT INTO public.client_access_audit (
      accessed_by,
      action,
      client_ids,
      result_count,
      search_term
    ) VALUES (
      current_user_id,
      action_param,
      client_ids_param,
      result_count_param,
      search_term_param
    );
  END IF;
  
  -- Always return successfully (don't fail if logging fails)
  RETURN;
EXCEPTION
  WHEN OTHERS THEN
    -- Silently ignore audit logging errors to prevent breaking client fetching
    RETURN;
END;
$$;