-- Fix infinite recursion in RLS policies by creating optimized security definer functions
-- and consolidating policies to avoid circular dependencies

-- STEP 1: Drop existing problematic functions that may cause recursion
DROP FUNCTION IF EXISTS public.get_current_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_agent() CASCADE;

-- STEP 2: Create optimized security definer functions to break circular dependencies
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid() LIMIT 1), false);
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_agent()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role IN ('agent', 'admin') FROM public.profiles WHERE id = auth.uid() LIMIT 1), false);
$$;

-- STEP 3: Drop all existing policies that may cause circular dependencies
DO $$
BEGIN
    -- Drop proposals policies
    DROP POLICY IF EXISTS "Allow token-based access to proposals" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_agent_select" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_client_select" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_agent_insert" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_agent_update" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_owner_delete" ON proposals CASCADE;
    
    -- Drop profiles policies
    DROP POLICY IF EXISTS "Users can create their own profile" ON profiles CASCADE;
    DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles CASCADE;
    DROP POLICY IF EXISTS "Users can view own profile" ON profiles CASCADE;
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles CASCADE;
    DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles CASCADE;
    DROP POLICY IF EXISTS "Agents can view client profiles" ON profiles CASCADE;
    DROP POLICY IF EXISTS "profiles_self_select" ON profiles CASCADE;
    DROP POLICY IF EXISTS "profiles_self_update" ON profiles CASCADE;
    DROP POLICY IF EXISTS "profiles_self_insert" ON profiles CASCADE;
END $$;

-- STEP 4: Create new consolidated policies using security definer functions

-- PROFILES policies - simplified and non-recursive
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT USING (
  auth.uid() = id OR 
  public.is_current_user_admin()
);

CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_policy" ON profiles
FOR DELETE USING (auth.uid() = id);

-- PROPOSALS policies - using security definer functions to avoid recursion
CREATE POLICY "proposals_select_policy" ON proposals
FOR SELECT USING (
  deleted_at IS NULL AND (
    auth.uid() = agent_id OR 
    auth.uid() = client_id OR 
    public.is_current_user_admin() OR
    auth.uid() IN (SELECT user_id FROM clients WHERE id = client_reference_id) OR
    (invitation_token IS NOT NULL AND 
     invitation_expires_at > now() AND 
     current_setting('request.invitation_token', true) = invitation_token)
  )
);

CREATE POLICY "proposals_insert_policy" ON proposals
FOR INSERT WITH CHECK (
  auth.uid() = agent_id AND 
  public.is_current_user_agent()
);

CREATE POLICY "proposals_update_policy" ON proposals
FOR UPDATE USING (
  deleted_at IS NULL AND (
    auth.uid() = agent_id OR 
    public.is_current_user_admin()
  )
);

CREATE POLICY "proposals_delete_policy" ON proposals
FOR DELETE USING (
  auth.uid() = agent_id OR 
  auth.uid() = client_id OR 
  public.is_current_user_admin() OR
  auth.uid() IN (SELECT user_id FROM clients WHERE id = client_reference_id)
);

-- STEP 5: Ensure RLS is enabled on both tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- STEP 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_id_role ON profiles(id, role);
CREATE INDEX IF NOT EXISTS idx_proposals_agent_deleted ON proposals(agent_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_proposals_client_deleted ON proposals(client_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_proposals_token ON proposals(invitation_token) WHERE invitation_token IS NOT NULL;