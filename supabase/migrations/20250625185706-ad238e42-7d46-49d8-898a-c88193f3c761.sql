
-- FINAL FIX: Clean up ALL existing RLS policies and create simple, non-recursive ones
DO $$
BEGIN
    -- Drop ALL existing policies to start completely clean
    DROP POLICY IF EXISTS "profiles_own_access" ON profiles CASCADE;
    DROP POLICY IF EXISTS "profiles_admin_access" ON profiles CASCADE;
    DROP POLICY IF EXISTS "profiles_own_update" ON profiles CASCADE;
    DROP POLICY IF EXISTS "profiles_own_insert" ON profiles CASCADE;
    DROP POLICY IF EXISTS "profiles_access_policy" ON profiles CASCADE;
    DROP POLICY IF EXISTS "profiles_update_policy" ON profiles CASCADE;
    DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles CASCADE;
    
    DROP POLICY IF EXISTS "proposals_agent_access" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_client_access" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_admin_access" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_agent_insert" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_agent_update" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_admin_update" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_owner_delete" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_select_policy" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_insert_policy" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_update_policy" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_delete_policy" ON proposals CASCADE;
    
    DROP POLICY IF EXISTS "clients_agent_access" ON clients CASCADE;
    DROP POLICY IF EXISTS "clients_own_access" ON clients CASCADE;
    DROP POLICY IF EXISTS "clients_agent_manage" ON clients CASCADE;
    DROP POLICY IF EXISTS "clients_select_policy" ON clients CASCADE;
    DROP POLICY IF EXISTS "clients_insert_policy" ON clients CASCADE;
    DROP POLICY IF EXISTS "clients_update_policy" ON clients CASCADE;
    DROP POLICY IF EXISTS "clients_delete_policy" ON clients CASCADE;
    
    DROP POLICY IF EXISTS "notifications_own_access" ON notifications CASCADE;
    DROP POLICY IF EXISTS "notifications_own_update" ON notifications CASCADE;
    DROP POLICY IF EXISTS "notifications_system_insert" ON notifications CASCADE;
    DROP POLICY IF EXISTS "notifications_select_policy" ON notifications CASCADE;
    DROP POLICY IF EXISTS "notifications_update_policy" ON notifications CASCADE;
    DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications CASCADE;
    
    DROP POLICY IF EXISTS "system_settings_admin_manage" ON system_settings CASCADE;
    DROP POLICY IF EXISTS "system_settings_public_read" ON system_settings CASCADE;
    DROP POLICY IF EXISTS "system_settings_admin_policy" ON system_settings CASCADE;
    DROP POLICY IF EXISTS "system_settings_read_policy" ON system_settings CASCADE;
END $$;

-- Drop and recreate helper functions to ensure they're clean
DROP FUNCTION IF EXISTS public.current_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.current_user_is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.current_user_is_agent_or_admin() CASCADE;

-- Create completely clean helper functions
CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    'client'
  );
$$;

-- PROFILES: Simple self-access only (no role-based access to prevent recursion)
CREATE POLICY "profiles_self_select" ON profiles
FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_self_update" ON profiles
FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_self_insert" ON profiles
FOR INSERT WITH CHECK (id = auth.uid());

-- PROPOSALS: Direct user checks without role dependencies
CREATE POLICY "proposals_agent_select" ON proposals
FOR SELECT USING (
  deleted_at IS NULL AND agent_id = auth.uid()
);

CREATE POLICY "proposals_client_select" ON proposals
FOR SELECT USING (
  deleted_at IS NULL AND (
    client_id = auth.uid() OR 
    client_reference_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  )
);

CREATE POLICY "proposals_agent_insert" ON proposals
FOR INSERT WITH CHECK (agent_id = auth.uid());

CREATE POLICY "proposals_agent_update" ON proposals
FOR UPDATE USING (
  deleted_at IS NULL AND agent_id = auth.uid()
);

CREATE POLICY "proposals_owner_delete" ON proposals
FOR DELETE USING (
  agent_id = auth.uid() OR 
  client_id = auth.uid() OR
  client_reference_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
);

-- CLIENTS: Simple access patterns
CREATE POLICY "clients_own_select" ON clients
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "clients_agent_select" ON clients
FOR SELECT USING (
  created_by = auth.uid() OR
  EXISTS(SELECT 1 FROM proposals WHERE agent_id = auth.uid() AND client_reference_id = clients.id)
);

CREATE POLICY "clients_agent_manage" ON clients
FOR ALL USING (
  created_by = auth.uid() OR user_id = auth.uid()
);

-- NOTIFICATIONS: User-specific only
CREATE POLICY "notifications_own_select" ON notifications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_own_update" ON notifications
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notifications_system_insert" ON notifications
FOR INSERT WITH CHECK (true);

-- SYSTEM_SETTINGS: Public read, admin write (check role directly)
CREATE POLICY "system_settings_public_read" ON system_settings
FOR SELECT USING (true);

CREATE POLICY "system_settings_admin_write" ON system_settings
FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_id_simple ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_proposals_agent_active ON proposals(agent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_client_active ON proposals(client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_user_id_simple ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_simple ON notifications(user_id);

-- Analyze for performance
ANALYZE profiles;
ANALYZE proposals;
ANALYZE clients;
ANALYZE notifications;
ANALYZE system_settings;
