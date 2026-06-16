-- Drop overly permissive policies
DROP POLICY IF EXISTS "Agents and admins can update all clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;

-- Create restrictive UPDATE policy matching SELECT restrictions
CREATE POLICY "Agents can update only their own clients"
  ON public.clients
  FOR UPDATE
  USING (
    is_current_user_admin()
    OR (
      is_current_user_agent() 
      AND (
        -- Created by the agent
        created_by = auth.uid()
        OR
        -- Assigned to agent via proposals
        id IN (
          SELECT DISTINCT COALESCE(p.client_reference_id, p.client_id)
          FROM proposals p
          WHERE p.agent_id = auth.uid()
            AND p.deleted_at IS NULL
            AND COALESCE(p.client_reference_id, p.client_id) IS NOT NULL
        )
      )
    )
    OR (user_id = auth.uid()) -- Clients can update their own profile
  );

-- Create restrictive DELETE policy
CREATE POLICY "Agents can delete only their own clients"
  ON public.clients
  FOR DELETE
  USING (
    is_current_user_admin()
    OR (
      is_current_user_agent()
      AND created_by = auth.uid() -- Only the creator can delete
    )
  );

-- Add columns to audit table for UPDATE/DELETE tracking
ALTER TABLE public.client_access_audit 
  ADD COLUMN IF NOT EXISTS modified_fields JSONB,
  ADD COLUMN IF NOT EXISTS old_values JSONB,
  ADD COLUMN IF NOT EXISTS new_values JSONB;

-- Function to log client modifications
CREATE OR REPLACE FUNCTION public.log_client_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.client_access_audit (
      accessed_by,
      action,
      client_ids,
      result_count,
      old_values,
      new_values,
      modified_fields
    ) VALUES (
      auth.uid(),
      'update',
      ARRAY[NEW.id],
      1,
      to_jsonb(OLD),
      to_jsonb(NEW),
      jsonb_build_object(
        'fields_changed', (
          SELECT jsonb_object_agg(key, value)
          FROM jsonb_each(to_jsonb(NEW))
          WHERE to_jsonb(OLD) -> key IS DISTINCT FROM value
        )
      )
    );
  END IF;

  -- Log DELETE operations
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.client_access_audit (
      accessed_by,
      action,
      client_ids,
      result_count,
      old_values
    ) VALUES (
      auth.uid(),
      'delete',
      ARRAY[OLD.id],
      1,
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS audit_client_modifications ON public.clients;
CREATE TRIGGER audit_client_modifications
  AFTER UPDATE OR DELETE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.log_client_modification();

-- Update get_agent_clients_paginated to log access
CREATE OR REPLACE FUNCTION public.get_agent_clients_paginated(
  agent_id_param UUID DEFAULT NULL,
  limit_param INTEGER DEFAULT 20,
  offset_param INTEGER DEFAULT 0
)
RETURNS TABLE(
  client_id UUID,
  client_name TEXT,
  client_email TEXT,
  company_name TEXT,
  is_registered BOOLEAN,
  project_count BIGINT,
  total_mwp NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_ids UUID[];
BEGIN
  -- Get client IDs for this page
  WITH client_proposals AS (
    SELECT 
      COALESCE(p.client_reference_id, p.client_id) as client_ref_id,
      COUNT(*) as project_count,
      SUM(COALESCE(p.system_size_kwp, p.annual_energy / 1000.0, 0)) as total_kwp
    FROM proposals p
    WHERE p.deleted_at IS NULL
      AND p.archived_at IS NULL
      AND (agent_id_param IS NULL OR p.agent_id = agent_id_param)
      AND COALESCE(p.client_reference_id, p.client_id) IS NOT NULL
    GROUP BY COALESCE(p.client_reference_id, p.client_id)
  )
  SELECT ARRAY_AGG(c.id) INTO result_ids
  FROM clients c
  INNER JOIN client_proposals cp ON c.id = cp.client_ref_id
  WHERE c.email IS NOT NULL
    AND TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) != ''
  ORDER BY TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')))
  LIMIT limit_param
  OFFSET offset_param;

  -- Log the access
  PERFORM public.log_client_access(
    'view_list',
    COALESCE(result_ids, ARRAY[]::UUID[]),
    COALESCE(array_length(result_ids, 1), 0),
    NULL
  );

  -- Return the actual data
  RETURN QUERY
  WITH client_proposals AS (
    SELECT 
      COALESCE(p.client_reference_id, p.client_id) as client_ref_id,
      COUNT(*) as project_count,
      SUM(COALESCE(p.system_size_kwp, p.annual_energy / 1000.0, 0)) as total_kwp
    FROM proposals p
    WHERE p.deleted_at IS NULL
      AND p.archived_at IS NULL
      AND (agent_id_param IS NULL OR p.agent_id = agent_id_param)
      AND COALESCE(p.client_reference_id, p.client_id) IS NOT NULL
    GROUP BY COALESCE(p.client_reference_id, p.client_id)
  )
  SELECT 
    c.id as client_id,
    TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) as client_name,
    c.email as client_email,
    COALESCE(c.company_name, '') as company_name,
    CASE WHEN c.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_registered,
    COALESCE(cp.project_count, 0) as project_count,
    COALESCE(cp.total_kwp / 1000.0, 0) as total_mwp,
    c.created_at
  FROM clients c
  INNER JOIN client_proposals cp ON c.id = cp.client_ref_id
  WHERE c.email IS NOT NULL
    AND TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) != ''
  ORDER BY client_name
  LIMIT limit_param
  OFFSET offset_param;
END;
$$;