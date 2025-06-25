
-- STEP 1: Drop all existing problematic policies to start clean
DO $$
BEGIN
    -- Drop all existing policies on all tables to prevent conflicts
    DROP POLICY IF EXISTS "profiles_select_policy" ON profiles CASCADE;
    DROP POLICY IF EXISTS "profiles_update_policy" ON profiles CASCADE; 
    DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles CASCADE;
    DROP POLICY IF EXISTS "profiles_select_optimized" ON profiles CASCADE;
    DROP POLICY IF EXISTS "profiles_update_optimized" ON profiles CASCADE;
    DROP POLICY IF EXISTS "profiles_insert_optimized" ON profiles CASCADE;
    DROP POLICY IF EXISTS "profiles_access_policy" ON profiles CASCADE;
    
    DROP POLICY IF EXISTS "proposals_select_policy" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_insert_policy" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_update_policy" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_delete_policy" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_select_optimized" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_insert_optimized" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_update_optimized" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_delete_optimized" ON proposals CASCADE;
    
    DROP POLICY IF EXISTS "clients_select_policy" ON clients CASCADE;
    DROP POLICY IF EXISTS "clients_insert_policy" ON clients CASCADE;
    DROP POLICY IF EXISTS "clients_update_policy" ON clients CASCADE;
    DROP POLICY IF EXISTS "clients_delete_policy" ON clients CASCADE;
    DROP POLICY IF EXISTS "clients_select_optimized" ON clients CASCADE;
    DROP POLICY IF EXISTS "clients_insert_optimized" ON clients CASCADE;
    DROP POLICY IF EXISTS "clients_update_optimized" ON clients CASCADE;
    DROP POLICY IF EXISTS "clients_delete_optimized" ON clients CASCADE;
    
    DROP POLICY IF EXISTS "notifications_select_policy" ON notifications CASCADE;
    DROP POLICY IF EXISTS "notifications_update_policy" ON notifications CASCADE;
    DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications CASCADE;
    DROP POLICY IF EXISTS "notifications_select_optimized" ON notifications CASCADE;
    DROP POLICY IF EXISTS "notifications_update_optimized" ON notifications CASCADE;
    DROP POLICY IF EXISTS "notifications_insert_optimized" ON notifications CASCADE;
    
    DROP POLICY IF EXISTS "system_settings_all_policy" ON system_settings CASCADE;
    DROP POLICY IF EXISTS "system_settings_select_policy" ON system_settings CASCADE;
    DROP POLICY IF EXISTS "system_settings_admin_policy" ON system_settings CASCADE;
    DROP POLICY IF EXISTS "system_settings_read_policy" ON system_settings CASCADE;
    DROP POLICY IF EXISTS "system_settings_admin_optimized" ON system_settings CASCADE;
    DROP POLICY IF EXISTS "system_settings_read_optimized" ON system_settings CASCADE;
END $$;

-- STEP 2: Create secure, non-recursive helper functions
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid() LIMIT 1), false);
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_agent_or_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role IN ('agent', 'admin') FROM public.profiles WHERE id = auth.uid() LIMIT 1), false);
$$;

-- STEP 3: Create simple, non-recursive RLS policies
-- PROFILES TABLE - Simple self-access + admin access
CREATE POLICY "profiles_own_access" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_admin_access" ON profiles
FOR SELECT USING (public.current_user_is_admin());

CREATE POLICY "profiles_own_update" ON profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_own_insert" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- PROPOSALS TABLE - Clear ownership-based access
CREATE POLICY "proposals_agent_access" ON proposals
FOR SELECT USING (
  deleted_at IS NULL AND auth.uid() = agent_id
);

CREATE POLICY "proposals_client_access" ON proposals
FOR SELECT USING (
  deleted_at IS NULL AND (
    auth.uid() = client_id OR 
    auth.uid() IN (SELECT user_id FROM clients WHERE id = client_reference_id)
  )
);

CREATE POLICY "proposals_admin_access" ON proposals
FOR SELECT USING (
  deleted_at IS NULL AND public.current_user_is_admin()
);

CREATE POLICY "proposals_agent_insert" ON proposals
FOR INSERT WITH CHECK (
  auth.uid() = agent_id AND public.current_user_is_agent_or_admin()
);

CREATE POLICY "proposals_agent_update" ON proposals
FOR UPDATE USING (
  deleted_at IS NULL AND auth.uid() = agent_id
);

CREATE POLICY "proposals_admin_update" ON proposals
FOR UPDATE USING (
  deleted_at IS NULL AND public.current_user_is_admin()
);

CREATE POLICY "proposals_owner_delete" ON proposals
FOR DELETE USING (
  auth.uid() = agent_id OR 
  auth.uid() = client_id OR 
  auth.uid() IN (SELECT user_id FROM clients WHERE id = client_reference_id) OR
  public.current_user_is_admin()
);

-- CLIENTS TABLE - Agent and admin management
CREATE POLICY "clients_agent_access" ON clients
FOR SELECT USING (public.current_user_is_agent_or_admin());

CREATE POLICY "clients_own_access" ON clients
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "clients_agent_manage" ON clients
FOR ALL USING (public.current_user_is_agent_or_admin());

-- NOTIFICATIONS TABLE - User-specific access
CREATE POLICY "notifications_own_access" ON notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_own_update" ON notifications
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notifications_system_insert" ON notifications
FOR INSERT WITH CHECK (true);

-- SYSTEM_SETTINGS TABLE - Admin management with public read
CREATE POLICY "system_settings_admin_manage" ON system_settings
FOR ALL USING (public.current_user_is_admin());

CREATE POLICY "system_settings_public_read" ON system_settings
FOR SELECT USING (true);

-- STEP 4: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_id_role_fixed ON profiles(id, role);
CREATE INDEX IF NOT EXISTS idx_proposals_agent_deleted ON proposals(agent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_client_deleted ON proposals(client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read);

-- STEP 5: Update existing helper functions to prevent conflicts
DROP FUNCTION IF EXISTS public.get_current_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_agent() CASCADE;

-- STEP 6: Analyze tables for query optimization
ANALYZE profiles;
ANALYZE proposals;
ANALYZE clients;
ANALYZE notifications;
ANALYZE system_settings;
