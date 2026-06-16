-- Create audit log table for client access tracking
CREATE TABLE IF NOT EXISTS public.client_access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accessed_by UUID NOT NULL REFERENCES auth.users(id),
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  action TEXT NOT NULL, -- 'search', 'view_list', 'view_details'
  client_ids UUID[] NOT NULL, -- Array of client IDs accessed
  result_count INTEGER NOT NULL DEFAULT 0,
  search_term TEXT, -- Optional: for search audits
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS on audit table
ALTER TABLE public.client_access_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.client_access_audit
  FOR SELECT
  USING (is_current_user_admin());

-- System can insert audit logs (will be called from RPC functions)
CREATE POLICY "System can insert audit logs"
  ON public.client_access_audit
  FOR INSERT
  WITH CHECK (accessed_by = auth.uid());

-- Create index for efficient querying
CREATE INDEX idx_client_access_audit_accessed_by ON public.client_access_audit(accessed_by);
CREATE INDEX idx_client_access_audit_accessed_at ON public.client_access_audit(accessed_at DESC);

-- Function to log client access
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
BEGIN
  INSERT INTO public.client_access_audit (
    accessed_by,
    action,
    client_ids,
    result_count,
    search_term
  ) VALUES (
    auth.uid(),
    action_param,
    client_ids_param,
    result_count_param,
    search_term_param
  );
END;
$$;

-- Update search_clients to include audit logging
CREATE OR REPLACE FUNCTION public.search_clients(search_term TEXT)
RETURNS TABLE(
  id UUID,
  name TEXT,
  email TEXT,
  company TEXT,
  is_registered BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role TEXT;
  current_user_id UUID;
  result_ids UUID[];
BEGIN
  current_user_id := auth.uid();
  current_user_role := public.get_current_user_role();
  
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;
  
  IF current_user_role NOT IN ('admin', 'agent') THEN
    RETURN;
  END IF;
  
  -- Collect results into array for auditing
  SELECT ARRAY_AGG(c.id) INTO result_ids
  FROM public.clients c
  WHERE (
      c.email ILIKE '%' || search_term || '%'
      OR c.first_name ILIKE '%' || search_term || '%'
      OR c.last_name ILIKE '%' || search_term || '%'
      OR c.company_name ILIKE '%' || search_term || '%'
    )
    AND (
      current_user_role = 'admin'
      OR c.created_by = current_user_id
      OR c.id IN (
        SELECT DISTINCT COALESCE(p.client_reference_id, p.client_id)
        FROM proposals p
        WHERE p.agent_id = current_user_id
          AND p.deleted_at IS NULL
          AND COALESCE(p.client_reference_id, p.client_id) IS NOT NULL
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.email = c.email AND pr.role = 'client'
    );
  
  -- Log the access
  PERFORM public.log_client_access(
    'search',
    COALESCE(result_ids, ARRAY[]::UUID[]),
    COALESCE(array_length(result_ids, 1), 0),
    search_term
  );
  
  -- Return results
  RETURN QUERY
  WITH deduplicated_clients AS (
    SELECT 
      p.id,
      CONCAT(p.first_name, ' ', p.last_name) as name,
      p.email,
      p.company_name as company,
      TRUE as is_registered,
      1 as priority
    FROM public.profiles p
    WHERE p.role = 'client'
      AND (
        p.email ILIKE '%' || search_term || '%'
        OR p.first_name ILIKE '%' || search_term || '%'
        OR p.last_name ILIKE '%' || search_term || '%'
        OR p.company_name ILIKE '%' || search_term || '%'
      )
      AND (
        current_user_role IN ('admin', 'agent')
        OR p.id = current_user_id
      )
    
    UNION
    
    SELECT 
      c.id,
      CONCAT(c.first_name, ' ', c.last_name) as name,
      c.email,
      c.company_name as company,
      CASE WHEN c.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_registered,
      CASE WHEN c.user_id IS NOT NULL THEN 1 ELSE 2 END as priority
    FROM public.clients c
    WHERE (
        c.email ILIKE '%' || search_term || '%'
        OR c.first_name ILIKE '%' || search_term || '%'
        OR c.last_name ILIKE '%' || search_term || '%'
        OR c.company_name ILIKE '%' || search_term || '%'
      )
      AND (
        current_user_role = 'admin'
        OR c.created_by = current_user_id
        OR c.id IN (
          SELECT DISTINCT COALESCE(p.client_reference_id, p.client_id)
          FROM proposals p
          WHERE p.agent_id = current_user_id
            AND p.deleted_at IS NULL
            AND COALESCE(p.client_reference_id, p.client_id) IS NOT NULL
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.email = c.email AND p.role = 'client'
      )
  )
  SELECT dc.id, dc.name, dc.email, dc.company, dc.is_registered
  FROM deduplicated_clients dc
  ORDER BY dc.priority ASC, dc.name ASC;
END;
$$;