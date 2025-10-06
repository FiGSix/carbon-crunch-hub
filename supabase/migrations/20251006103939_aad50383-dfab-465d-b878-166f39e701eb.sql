-- Phase 1: Create Multi-Role System Schema

-- 1. Create app_role enum type
CREATE TYPE public.app_role AS ENUM ('admin', 'agent', 'client');

-- 2. Create user_roles table with proper constraints
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check if user has a role (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- 4. Create function to get all roles for a user
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS TABLE(role public.app_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'agent' THEN 2
      WHEN 'client' THEN 3
    END;
$$;

-- 5. Create function to get primary role (highest priority role)
CREATE OR REPLACE FUNCTION public.get_primary_role(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::TEXT
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'agent' THEN 2
      WHEN 'client' THEN 3
    END
  LIMIT 1;
$$;

-- Phase 2: Migrate Existing Data

-- 6. Migrate all existing roles from profiles.role to user_roles table
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT 
  id,
  role::public.app_role,
  created_at
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 7. Add Shaun as both admin AND agent (Shaun's ID from the context)
INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('6538aa1a-c0dc-4ce4-ab6f-bb4368d9fce1', 'admin'),
  ('6538aa1a-c0dc-4ce4-ab6f-bb4368d9fce1', 'agent')
ON CONFLICT (user_id, role) DO NOTHING;

-- Phase 3: Update Helper Functions to Use New System

-- 8. Update is_current_user_admin to use new multi-role system
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

-- 9. Update is_current_user_agent to use new multi-role system
CREATE OR REPLACE FUNCTION public.is_current_user_agent()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'agent') OR public.has_role(auth.uid(), 'admin');
$$;

-- 10. Update get_current_user_role to return primary role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_primary_role(auth.uid());
$$;

-- Phase 4: Update Agent Management Function

-- 11. Update get_agents_management_data to include users with 'agent' OR 'admin' role
CREATE OR REPLACE FUNCTION public.get_agents_management_data(
  status_filter TEXT DEFAULT NULL,
  search_term TEXT DEFAULT NULL,
  limit_param INTEGER DEFAULT 50,
  offset_param INTEGER DEFAULT 0
)
RETURNS TABLE(
  agent_id UUID,
  agent_name TEXT,
  agent_email TEXT,
  company_name TEXT,
  agent_status TEXT,
  access_level TEXT,
  commission_override NUMERIC,
  last_active_at TIMESTAMP WITH TIME ZONE,
  total_proposals BIGINT,
  active_proposals BIGINT,
  signed_proposals BIGINT,
  total_commission NUMERIC,
  join_date DATE,
  onboarding_completed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    pr.id,
    TRIM(CONCAT(COALESCE(pr.first_name, ''), ' ', COALESCE(pr.last_name, ''))) as name,
    pr.email,
    pr.company_name,
    pr.agent_status,
    pr.access_level,
    pr.commission_override,
    pr.last_active_at,
    COALESCE(ast.total_count, 0),
    COALESCE(ast.active_count, 0),
    COALESCE(ast.signed_count, 0),
    COALESCE(cs.total_commission, 0),
    pr.join_date,
    pr.onboarding_completed
  FROM public.profiles pr
  LEFT JOIN agent_stats ast ON pr.id = ast.agent_id
  LEFT JOIN commission_stats cs ON pr.id = cs.agent_id
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = pr.id 
    AND ur.role IN ('agent', 'admin')
  )
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
$$;

-- Phase 5: RLS Policies for user_roles Table

-- 12. Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 13. Only admins can insert roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 14. Only admins can update roles
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 15. Only admins can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Phase 6: Add Comment to profiles.role for Deprecation Notice

COMMENT ON COLUMN public.profiles.role IS 'DEPRECATED: Use user_roles table instead. Kept for backward compatibility during transition.';