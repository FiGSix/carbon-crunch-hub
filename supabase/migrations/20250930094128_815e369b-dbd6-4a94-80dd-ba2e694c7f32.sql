-- CRITICAL SECURITY FIX: Add search_path to all security definer functions
-- This prevents schema injection attacks

-- Fix get_client_email function
CREATE OR REPLACE FUNCTION public.get_client_email()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public', 'auth'
AS $function$
  SELECT email FROM auth.users WHERE id = auth.uid();
$function$;

-- Fix get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$function$;

-- Fix get_current_user_role function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$function$;

-- Fix is_current_user_admin function
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT COALESCE((SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid() LIMIT 1), false);
$function$;

-- Fix is_current_user_agent function
CREATE OR REPLACE FUNCTION public.is_current_user_agent()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT COALESCE((SELECT role IN ('agent', 'admin') FROM public.profiles WHERE id = auth.uid() LIMIT 1), false);
$function$;

-- Fix is_proposal_client function
CREATE OR REPLACE FUNCTION public.is_proposal_client(proposal_client_reference_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS(
    SELECT 1 FROM clients 
    WHERE id = proposal_client_reference_id 
    AND user_id = auth.uid()
  );
$function$;

-- Fix create_test_user_profile function
CREATE OR REPLACE FUNCTION public.create_test_user_profile(
  user_id_param uuid,
  email_param text,
  role_param text,
  first_name_param text DEFAULT 'Test'::text,
  last_name_param text DEFAULT 'User'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id, email, role, first_name, last_name, created_at
  ) VALUES (
    user_id_param, email_param, role_param, first_name_param, last_name_param, NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;
  
  RETURN user_id_param;
END;
$function$;

-- Fix test_rls_policies function
CREATE OR REPLACE FUNCTION public.test_rls_policies()
RETURNS TABLE(
  test_name text,
  table_name text,
  operation text,
  role text,
  result text,
  success boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  test_admin_id UUID := '00000000-0000-0000-0000-000000000001';
  test_agent_id UUID := '00000000-0000-0000-0000-000000000002';
  test_client_id UUID := '00000000-0000-0000-0000-000000000003';
BEGIN
  PERFORM public.create_test_user_profile(test_admin_id, 'admin@test.com', 'admin', 'Test', 'Admin');
  PERFORM public.create_test_user_profile(test_agent_id, 'agent@test.com', 'agent', 'Test', 'Agent');
  PERFORM public.create_test_user_profile(test_client_id, 'client@test.com', 'client', 'Test', 'Client');

  RETURN QUERY
  SELECT 
    'RLS Policy Setup'::TEXT,
    'all_tables'::TEXT,
    'SETUP'::TEXT,
    'system'::TEXT,
    'All RLS policies have been recreated with clean names'::TEXT,
    TRUE;
    
  RETURN QUERY
  SELECT 
    'Helper Functions'::TEXT,
    'functions'::TEXT,
    'CREATE'::TEXT,
    'system'::TEXT,
    'Role checking functions created successfully'::TEXT,
    TRUE;

  RETURN;
END;
$function$;

-- Fix mark_invitation_viewed function
CREATE OR REPLACE FUNCTION public.mark_invitation_viewed(token_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE proposals
  SET invitation_viewed_at = now()
  WHERE invitation_token = token_param
  AND invitation_viewed_at IS NULL;
END;
$function$;

-- Fix get_agent_clients_count function
CREATE OR REPLACE FUNCTION public.get_agent_clients_count(agent_id_param uuid DEFAULT NULL::uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN (
    WITH client_proposals AS (
      SELECT DISTINCT 
        COALESCE(p.client_reference_id, p.client_id) as client_ref_id
      FROM proposals p
      WHERE p.deleted_at IS NULL
        AND p.archived_at IS NULL
        AND (agent_id_param IS NULL OR p.agent_id = agent_id_param)
        AND COALESCE(p.client_reference_id, p.client_id) IS NOT NULL
    )
    SELECT COUNT(*)::INTEGER
    FROM clients c
    INNER JOIN client_proposals cp ON c.id = cp.client_ref_id
    WHERE c.email IS NOT NULL
      AND TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) != ''
  );
END;
$function$;

-- Fix get_proposal_by_token function
CREATE OR REPLACE FUNCTION public.get_proposal_by_token(token_param text)
RETURNS TABLE(
  id uuid, title text, status text, content jsonb, agent_id uuid,
  client_id uuid, client_contact_id uuid, signed_at timestamp with time zone,
  created_at timestamp with time zone, archived_at timestamp with time zone,
  review_later_until timestamp with time zone, is_preview boolean,
  preview_of_id uuid, client_email text, invitation_token text,
  invitation_expires_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _client_email TEXT;
  _token_valid BOOLEAN;
BEGIN
  PERFORM set_config('request.invitation_token', token_param, true);
  
  SELECT 
    EXISTS(
      SELECT 1 
      FROM proposals 
      WHERE invitation_token = token_param AND invitation_expires_at > now()
    ) INTO _token_valid;
    
  IF NOT _token_valid THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;

  SELECT 
    COALESCE(
      (p.content->'clientInfo'->>'email'),
      (SELECT email FROM public.profiles WHERE id = p.client_id),
      (SELECT email FROM public.clients WHERE id = p.client_reference_id)
    ) INTO _client_email
  FROM proposals p
  WHERE p.invitation_token = token_param;

  RETURN QUERY
  SELECT
    p.id, p.title, p.status, p.content, p.agent_id, p.client_id,
    NULL::uuid as client_contact_id,
    p.signed_at, p.created_at, p.archived_at, p.review_later_until,
    p.is_preview, p.preview_of_id, _client_email as client_email,
    p.invitation_token, p.invitation_expires_at
  FROM proposals p
  WHERE p.invitation_token = token_param AND p.invitation_expires_at > now();
END;
$function$;

-- Fix get_agent_clients_paginated function
CREATE OR REPLACE FUNCTION public.get_agent_clients_paginated(
  agent_id_param uuid DEFAULT NULL::uuid,
  limit_param integer DEFAULT 20,
  offset_param integer DEFAULT 0
)
RETURNS TABLE(
  client_id uuid, client_name text, client_email text,
  company_name text, is_registered boolean, project_count bigint,
  total_mwp numeric, created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
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
$function$;

-- Fix get_agent_dashboard_stats function
CREATE OR REPLACE FUNCTION public.get_agent_dashboard_stats(agent_id_param uuid)
RETURNS TABLE(
  total_proposals bigint, active_proposals bigint, signed_proposals bigint,
  total_clients bigint, total_carbon_credits numeric, total_revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH proposal_stats AS (
    SELECT 
      COUNT(*) as total_count,
      COUNT(*) FILTER (WHERE status IN ('pending', 'review_later')) as active_count,
      COUNT(*) FILTER (WHERE status = 'signed') as signed_count,
      SUM(COALESCE(carbon_credits, 0)) as total_credits,
      SUM(COALESCE(carbon_credits * client_share_percentage / 100, 0)) as revenue
    FROM proposals 
    WHERE agent_id = agent_id_param 
      AND deleted_at IS NULL 
      AND archived_at IS NULL
  ),
  client_stats AS (
    SELECT COUNT(DISTINCT COALESCE(client_reference_id, client_id)) as unique_clients
    FROM proposals 
    WHERE agent_id = agent_id_param 
      AND deleted_at IS NULL 
      AND COALESCE(client_reference_id, client_id) IS NOT NULL
  )
  SELECT 
    ps.total_count, ps.active_count, ps.signed_count,
    cs.unique_clients, ps.total_credits, ps.revenue
  FROM proposal_stats ps, client_stats cs;
END;
$function$;

-- Fix archive_proposal function
CREATE OR REPLACE FUNCTION public.archive_proposal(proposal_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  proposal_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 
    FROM proposals 
    WHERE id = proposal_id 
    AND (
      client_id = user_id 
      OR agent_id = user_id
      OR EXISTS(SELECT 1 FROM profiles WHERE id = user_id AND role = 'admin')
    )
  ) INTO proposal_exists;
  
  IF NOT proposal_exists THEN
    RETURN FALSE;
  END IF;
  
  UPDATE proposals
  SET archived_at = NOW(), archived_by = user_id
  WHERE id = proposal_id;
  
  RETURN TRUE;
END;
$function$;

-- Fix delete_proposal function
CREATE OR REPLACE FUNCTION public.delete_proposal(proposal_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  proposal_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 
    FROM proposals 
    WHERE id = proposal_id 
    AND (
      client_id = user_id 
      OR agent_id = user_id
      OR EXISTS(SELECT 1 FROM profiles WHERE id = user_id AND role = 'admin')
    )
  ) INTO proposal_exists;
  
  IF NOT proposal_exists THEN
    RETURN FALSE;
  END IF;
  
  UPDATE proposals
  SET deleted_at = NOW(), deleted_by = user_id
  WHERE id = proposal_id;
  
  RETURN TRUE;
END;
$function$;

-- Fix search_clients_optimized function
CREATE OR REPLACE FUNCTION public.search_clients_optimized(
  search_term text,
  agent_id_param uuid DEFAULT NULL::uuid,
  limit_param integer DEFAULT 20
)
RETURNS TABLE(
  id uuid, name text, email text, company text,
  is_registered boolean, relevance_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH scored_clients AS (
    SELECT 
      c.id,
      TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) as client_name,
      c.email,
      COALESCE(c.company_name, '') as company_name,
      CASE WHEN c.user_id IS NOT NULL THEN TRUE ELSE FALSE END as registered,
      CASE 
        WHEN c.email ILIKE search_term || '%' THEN 100
        WHEN c.first_name ILIKE search_term || '%' OR c.last_name ILIKE search_term || '%' THEN 90
        WHEN c.company_name ILIKE search_term || '%' THEN 80
        WHEN c.email ILIKE '%' || search_term || '%' THEN 70
        WHEN CONCAT(c.first_name, ' ', c.last_name) ILIKE '%' || search_term || '%' THEN 60
        WHEN c.company_name ILIKE '%' || search_term || '%' THEN 50
        ELSE 10
      END as score
    FROM clients c
    WHERE (
      c.email ILIKE '%' || search_term || '%'
      OR c.first_name ILIKE '%' || search_term || '%'
      OR c.last_name ILIKE '%' || search_term || '%'
      OR c.company_name ILIKE '%' || search_term || '%'
    )
    AND (agent_id_param IS NULL OR c.created_by = agent_id_param)
  )
  SELECT sc.id, sc.client_name, sc.email, sc.company_name, sc.registered, sc.score
  FROM scored_clients sc
  ORDER BY sc.score DESC, sc.client_name ASC
  LIMIT limit_param;
END;
$function$;

-- Fix search_proposals_optimized function
CREATE OR REPLACE FUNCTION public.search_proposals_optimized(
  user_id_param uuid,
  user_role_param text,
  search_term text DEFAULT NULL::text,
  status_filter text DEFAULT 'all'::text,
  limit_param integer DEFAULT 20,
  offset_param integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, title text, status text, created_at timestamp with time zone,
  agent_id uuid, client_id uuid, client_reference_id uuid,
  carbon_credits numeric, system_size_kwp numeric,
  invitation_sent_at timestamp with time zone,
  invitation_viewed_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH filtered_proposals AS (
    SELECT 
      p.id, p.title, p.status, p.created_at, p.agent_id, 
      p.client_id, p.client_reference_id, p.carbon_credits,
      p.system_size_kwp, p.invitation_sent_at, p.invitation_viewed_at
    FROM proposals p
    WHERE p.deleted_at IS NULL
      AND (
        CASE user_role_param
          WHEN 'admin' THEN true
          WHEN 'agent' THEN p.agent_id = user_id_param
          WHEN 'client' THEN (p.client_id = user_id_param OR p.client_reference_id = user_id_param)
          ELSE false
        END
      )
      AND (
        status_filter = 'all' OR
        (status_filter = 'archived' AND p.archived_at IS NOT NULL) OR
        (status_filter = 'review-later' AND p.review_later_until IS NOT NULL AND p.review_later_until >= now()) OR
        (status_filter != 'archived' AND status_filter != 'review-later' AND p.status = status_filter)
      )
      AND (
        search_term IS NULL OR
        p.title ILIKE '%' || search_term || '%' OR
        p.content->>'clientInfo' ILIKE '%' || search_term || '%'
      )
  )
  SELECT fp.id, fp.title, fp.status, fp.created_at, fp.agent_id,
         fp.client_id, fp.client_reference_id, fp.carbon_credits,
         fp.system_size_kwp, fp.invitation_sent_at, fp.invitation_viewed_at
  FROM filtered_proposals fp
  ORDER BY fp.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$function$;

-- Fix search_clients function
CREATE OR REPLACE FUNCTION public.search_clients(search_term text)
RETURNS TABLE(
  id uuid, name text, email text, company text, is_registered boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
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
      AND NOT EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.email = c.email AND p.role = 'client'
      )
  )
  SELECT dc.id, dc.name, dc.email, dc.company, dc.is_registered
  FROM deduplicated_clients dc
  ORDER BY dc.priority ASC, dc.name ASC;
END;
$function$;

-- Fix get_agents_management_data function
CREATE OR REPLACE FUNCTION public.get_agents_management_data(
  status_filter text DEFAULT NULL::text,
  search_term text DEFAULT NULL::text,
  limit_param integer DEFAULT 50,
  offset_param integer DEFAULT 0
)
RETURNS TABLE(
  agent_id uuid, agent_name text, agent_email text, company_name text,
  agent_status text, access_level text, commission_override numeric,
  last_active_at timestamp with time zone, total_proposals bigint,
  active_proposals bigint, signed_proposals bigint, total_commission numeric,
  join_date date, onboarding_completed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH agent_stats AS (
    SELECT 
      p.agent_id,
      COUNT(*) as total_count,
      COUNT(*) FILTER (WHERE p.status IN ('pending', 'review_later')) as active_count,
      COUNT(*) FILTER (WHERE p.status = 'signed') as signed_count
    FROM public.proposals p
    WHERE p.deleted_at IS NULL AND p.archived_at IS NULL
    GROUP BY p.agent_id
  ),
  commission_stats AS (
    SELECT 
      ac.agent_id,
      SUM(ac.commission_amount) as total_commission
    FROM public.agent_commissions ac
    WHERE ac.commission_status = 'paid'
    GROUP BY ac.agent_id
  )
  SELECT 
    pr.id, TRIM(CONCAT(COALESCE(pr.first_name, ''), ' ', COALESCE(pr.last_name, ''))) as name,
    pr.email, pr.company_name, pr.agent_status, pr.access_level, pr.commission_override,
    pr.last_active_at, COALESCE(ast.total_count, 0), COALESCE(ast.active_count, 0),
    COALESCE(ast.signed_count, 0), COALESCE(cs.total_commission, 0),
    pr.join_date, pr.onboarding_completed
  FROM public.profiles pr
  LEFT JOIN agent_stats ast ON pr.id = ast.agent_id
  LEFT JOIN commission_stats cs ON pr.id = cs.agent_id
  WHERE pr.role = 'agent'
    AND (status_filter IS NULL OR pr.agent_status = status_filter)
    AND (
      search_term IS NULL OR 
      pr.email ILIKE '%' || search_term || '%' OR
      pr.first_name ILIKE '%' || search_term || '%' OR
      pr.last_name ILIKE '%' || search_term || '%' OR
      pr.company_name ILIKE '%' || search_term || '%'
    )
  ORDER BY pr.last_active_at DESC NULLS LAST, pr.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$function$;

-- Fix get_dashboard_stats_optimized function
CREATE OR REPLACE FUNCTION public.get_dashboard_stats_optimized(
  user_id_param uuid,
  user_role_param text
)
RETURNS TABLE(
  total_proposals bigint, active_proposals bigint, signed_proposals bigint,
  total_carbon_credits numeric, total_revenue numeric, portfolio_size_kwp numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE p.status IN ('pending', 'review_later')) as active_count,
    COUNT(*) FILTER (WHERE p.status = 'signed') as signed_count,
    COALESCE(SUM(p.carbon_credits), 0) as total_credits,
    COALESCE(SUM(p.carbon_credits * p.client_share_percentage / 100), 0) as revenue,
    COALESCE(SUM(p.system_size_kwp), 0) as portfolio_kwp
  FROM proposals p
  WHERE p.deleted_at IS NULL
    AND p.archived_at IS NULL
    AND (
      CASE user_role_param
        WHEN 'admin' THEN true
        WHEN 'agent' THEN p.agent_id = user_id_param
        WHEN 'client' THEN (p.client_id = user_id_param OR p.client_reference_id = user_id_param)
        ELSE false
      END
    );
END;
$function$;

-- Fix validate_token_direct function
CREATE OR REPLACE FUNCTION public.validate_token_direct(token_param text)
RETURNS TABLE(
  proposal_id uuid, client_email text, client_id uuid,
  client_reference_id uuid, is_valid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _proposal_id UUID;
  _client_email TEXT;
  _client_id UUID;
  _client_reference_id UUID;
  _is_valid BOOLEAN := false;
BEGIN
  SELECT 
    p.id, 
    COALESCE(
      (p.content->'clientInfo'->>'email'),
      (SELECT email FROM public.profiles WHERE id = p.client_id),
      (SELECT email FROM public.clients WHERE id = p.client_reference_id)
    ),
    p.client_id,
    p.client_reference_id
  INTO _proposal_id, _client_email, _client_id, _client_reference_id
  FROM public.proposals p
  WHERE p.invitation_token = token_param AND p.invitation_expires_at > now();
  
  IF _proposal_id IS NOT NULL THEN
    _is_valid := true;
    RAISE NOTICE 'Valid proposal found for token: %, proposal_id: %', token_param, _proposal_id;
  ELSE
    RAISE WARNING 'No valid proposal found for token: %', token_param;
  END IF;
  
  RETURN QUERY SELECT _proposal_id, _client_email, _client_id, _client_reference_id, _is_valid;
END;
$function$;

-- Fix validate_invitation_token function
CREATE OR REPLACE FUNCTION public.validate_invitation_token(token text)
RETURNS TABLE(
  proposal_id uuid, client_email text, client_id uuid, client_reference_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _proposal_id UUID;
  _client_email TEXT;
  _client_id UUID;
  _client_reference_id UUID;
BEGIN
  SELECT 
    p.id, 
    COALESCE(
      (p.content->'clientInfo'->>'email'),
      (SELECT email FROM public.profiles WHERE id = p.client_id),
      (SELECT email FROM public.clients WHERE id = p.client_reference_id)
    ),
    p.client_id,
    p.client_reference_id
  INTO _proposal_id, _client_email, _client_id, _client_reference_id
  FROM public.proposals p
  WHERE p.invitation_token = token AND p.invitation_expires_at > now();
  
  IF _proposal_id IS NULL THEN
    RAISE WARNING 'No valid proposal found for token: %', token;
  ELSE
    RAISE NOTICE 'Valid proposal found for token: %, proposal_id: %', token, _proposal_id;
  END IF;
  
  RETURN QUERY SELECT _proposal_id, _client_email, _client_id, _client_reference_id;
END;
$function$;

-- Fix get_proposal_by_token_direct function
CREATE OR REPLACE FUNCTION public.get_proposal_by_token_direct(token_param text)
RETURNS TABLE(
  id uuid, title text, status text, content jsonb, agent_id uuid,
  client_id uuid, client_reference_id uuid, signed_at timestamp with time zone,
  created_at timestamp with time zone, archived_at timestamp with time zone,
  review_later_until timestamp with time zone, is_preview boolean,
  preview_of_id uuid, client_email text, invitation_token text,
  invitation_expires_at timestamp with time zone, annual_energy numeric,
  carbon_credits numeric, client_share_percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _client_email TEXT;
  _token_valid BOOLEAN;
BEGIN
  SELECT 
    EXISTS(
      SELECT 1 
      FROM proposals 
      WHERE invitation_token = token_param AND invitation_expires_at > now()
    ) INTO _token_valid;
    
  IF NOT _token_valid THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;

  SELECT 
    COALESCE(
      (p.content->'clientInfo'->>'email'),
      (SELECT email FROM public.profiles WHERE id = p.client_id),
      (SELECT email FROM public.clients WHERE id = p.client_reference_id)
    ) INTO _client_email
  FROM proposals p
  WHERE p.invitation_token = token_param;

  RETURN QUERY
  SELECT
    p.id, p.title, p.status, p.content, p.agent_id, p.client_id,
    p.client_reference_id, p.signed_at, p.created_at, p.archived_at,
    p.review_later_until, p.is_preview, p.preview_of_id,
    _client_email as client_email, p.invitation_token, p.invitation_expires_at,
    p.annual_energy, p.carbon_credits, p.client_share_percentage
  FROM proposals p
  WHERE p.invitation_token = token_param AND p.invitation_expires_at > now();
END;
$function$;

-- Fix get_agent_clients function
CREATE OR REPLACE FUNCTION public.get_agent_clients(agent_id_param uuid DEFAULT NULL::uuid)
RETURNS TABLE(
  client_id uuid, client_name text, client_email text, company_name text,
  is_registered boolean, project_count bigint, total_mwp numeric,
  agent_id uuid, agent_name text, created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH client_proposals AS (
    SELECT 
      p.id as proposal_id, p.agent_id,
      COALESCE(p.client_reference_id, p.client_id) as client_ref_id,
      COALESCE(p.annual_energy, 0) as annual_energy
    FROM proposals p
    WHERE p.status != 'archived'
      AND (agent_id_param IS NULL OR p.agent_id = agent_id_param)
      AND COALESCE(p.client_reference_id, p.client_id) IS NOT NULL
  ),
  client_stats AS (
    SELECT 
      cp.client_ref_id, cp.agent_id,
      COUNT(*) as project_count,
      SUM(cp.annual_energy / 1000.0) as total_mwp
    FROM client_proposals cp
    GROUP BY cp.client_ref_id, cp.agent_id
  )
  SELECT 
    c.id as client_id,
    TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) as client_name,
    c.email as client_email,
    COALESCE(c.company_name, '') as company_name,
    CASE WHEN c.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_registered,
    COALESCE(cs.project_count, 0) as project_count,
    COALESCE(cs.total_mwp, 0) as total_mwp,
    cs.agent_id,
    TRIM(CONCAT(COALESCE(ap.first_name, ''), ' ', COALESCE(ap.last_name, ''))) as agent_name,
    c.created_at
  FROM public.clients c
  LEFT JOIN client_stats cs ON c.id = cs.client_ref_id
  LEFT JOIN public.profiles ap ON cs.agent_id = ap.id
  WHERE cs.client_ref_id IS NOT NULL
    AND c.email IS NOT NULL
    AND TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) != ''
  ORDER BY client_name;
END;
$function$;

-- Fix get_agent_clients_optimized function
CREATE OR REPLACE FUNCTION public.get_agent_clients_optimized(agent_id_param uuid DEFAULT NULL::uuid)
RETURNS TABLE(
  client_id uuid, client_name text, client_email text, company_name text,
  is_registered boolean, project_count bigint, total_mwp numeric,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
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
  LEFT JOIN client_proposals cp ON c.id = cp.client_ref_id
  WHERE c.email IS NOT NULL
    AND TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) != ''
    AND (
      agent_id_param IS NULL 
      OR (cp.client_ref_id IS NOT NULL OR c.created_by = agent_id_param)
    )
  ORDER BY client_name;
END;
$function$;

-- Fix create_agent_user function
CREATE OR REPLACE FUNCTION public.create_agent_user(
  email_param text,
  first_name_param text,
  last_name_param text,
  company_name_param text DEFAULT NULL::text,
  phone_param text DEFAULT NULL::text,
  license_number_param text DEFAULT NULL::text,
  territory_param text DEFAULT NULL::text,
  agent_status_param text DEFAULT 'pending_approval'::text,
  access_level_param text DEFAULT 'standard'::text,
  commission_override_param numeric DEFAULT NULL::numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Only administrators can create agent accounts';
  END IF;

  new_user_id := gen_random_uuid();

  INSERT INTO public.profiles (
    id, email, first_name, last_name, company_name, phone,
    license_number, territory, role, agent_status, access_level,
    commission_override, onboarding_completed, join_date, created_at
  ) VALUES (
    new_user_id, email_param, first_name_param, last_name_param,
    company_name_param, phone_param, license_number_param, territory_param,
    'agent', agent_status_param, access_level_param, commission_override_param,
    false, CURRENT_DATE, now()
  );

  RETURN new_user_id;
END;
$function$;

-- Fix transfer_agent_clients_to_crunch_carbon function (already has search_path)
-- This function was already secure

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'auth'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id, first_name, last_name, company_name, email, role, terms_accepted_at
  ) VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'company_name',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    CASE 
      WHEN NEW.raw_user_meta_data->>'terms_accepted_at' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'terms_accepted_at')::TIMESTAMP WITH TIME ZONE 
      ELSE NULL 
    END
  );
  RETURN NEW;
END;
$function$;

-- Update system_settings RLS policies for admin-only access
DROP POLICY IF EXISTS "system_settings_public_read" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_admin_write" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can view system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can insert system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can update system settings" ON public.system_settings;

-- Create single comprehensive admin policy
CREATE POLICY "system_settings_admin_only"
ON public.system_settings
FOR ALL
TO authenticated
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());