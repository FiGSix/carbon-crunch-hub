
-- PHASE 1: DATABASE PERFORMANCE OPTIMIZATION (Fixed Version)
-- This migration consolidates RLS policies and optimizes security functions

-- STEP 1: Drop existing problematic policies that may be causing performance issues
DO $$
BEGIN
    -- Clean up any duplicate or conflicting policies
    DROP POLICY IF EXISTS "profiles_select_policy" ON profiles CASCADE;
    DROP POLICY IF EXISTS "profiles_update_policy" ON profiles CASCADE; 
    DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles CASCADE;
    DROP POLICY IF EXISTS "proposals_select_policy" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_insert_policy" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_update_policy" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_delete_policy" ON proposals CASCADE;
    DROP POLICY IF EXISTS "clients_select_policy" ON clients CASCADE;
    DROP POLICY IF EXISTS "clients_insert_policy" ON clients CASCADE;
    DROP POLICY IF EXISTS "clients_update_policy" ON clients CASCADE;
    DROP POLICY IF EXISTS "clients_delete_policy" ON clients CASCADE;
    DROP POLICY IF EXISTS "notifications_select_policy" ON notifications CASCADE;
    DROP POLICY IF EXISTS "notifications_update_policy" ON notifications CASCADE;
    DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications CASCADE;
    DROP POLICY IF EXISTS "system_settings_all_policy" ON system_settings CASCADE;
    DROP POLICY IF EXISTS "system_settings_select_policy" ON system_settings CASCADE;
END $$;

-- STEP 2: Optimize security functions for better performance
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()), false);
$$;

CREATE OR REPLACE FUNCTION public.is_agent()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role IN ('agent', 'admin') FROM public.profiles WHERE id = auth.uid()), false);
$$;

-- STEP 3: Create regular indexes for better query performance (non-concurrent)
CREATE INDEX IF NOT EXISTS idx_profiles_id_role ON profiles(id, role);
CREATE INDEX IF NOT EXISTS idx_proposals_agent_status ON proposals(agent_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_client_status ON proposals(client_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_invitation_token ON proposals(invitation_token) WHERE invitation_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

-- STEP 4: Create streamlined, high-performance RLS policies
-- PROFILES
CREATE POLICY "profiles_select_optimized" ON profiles
FOR SELECT USING (
  auth.uid() = id OR 
  COALESCE((SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()), false)
);

CREATE POLICY "profiles_update_optimized" ON profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_optimized" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- PROPOSALS
CREATE POLICY "proposals_select_optimized" ON proposals
FOR SELECT USING (
  deleted_at IS NULL AND (
    auth.uid() = agent_id OR 
    auth.uid() = client_id OR 
    COALESCE((SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()), false) OR
    auth.uid() IN (SELECT user_id FROM clients WHERE id = client_reference_id)
  )
);

CREATE POLICY "proposals_insert_optimized" ON proposals
FOR INSERT WITH CHECK (
  auth.uid() = agent_id AND 
  COALESCE((SELECT role IN ('agent', 'admin') FROM public.profiles WHERE id = auth.uid()), false)
);

CREATE POLICY "proposals_update_optimized" ON proposals
FOR UPDATE USING (
  deleted_at IS NULL AND (
    auth.uid() = agent_id OR 
    COALESCE((SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()), false)
  )
);

CREATE POLICY "proposals_delete_optimized" ON proposals
FOR DELETE USING (
  auth.uid() = agent_id OR 
  auth.uid() = client_id OR 
  COALESCE((SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()), false)
);

-- CLIENTS
CREATE POLICY "clients_select_optimized" ON clients
FOR SELECT USING (
  COALESCE((SELECT role IN ('agent', 'admin') FROM public.profiles WHERE id = auth.uid()), false) OR 
  auth.uid() = user_id
);

CREATE POLICY "clients_insert_optimized" ON clients
FOR INSERT WITH CHECK (
  COALESCE((SELECT role IN ('agent', 'admin') FROM public.profiles WHERE id = auth.uid()), false)
);

CREATE POLICY "clients_update_optimized" ON clients
FOR UPDATE USING (
  COALESCE((SELECT role IN ('agent', 'admin') FROM public.profiles WHERE id = auth.uid()), false)
);

CREATE POLICY "clients_delete_optimized" ON clients
FOR DELETE USING (
  COALESCE((SELECT role IN ('agent', 'admin') FROM public.profiles WHERE id = auth.uid()), false)
);

-- NOTIFICATIONS
CREATE POLICY "notifications_select_optimized" ON notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_optimized" ON notifications
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_optimized" ON notifications
FOR INSERT WITH CHECK (true);

-- SYSTEM_SETTINGS
CREATE POLICY "system_settings_admin_optimized" ON system_settings
FOR ALL USING (
  COALESCE((SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()), false)
);

CREATE POLICY "system_settings_read_optimized" ON system_settings
FOR SELECT USING (true);

-- STEP 5: Analyze tables for better query planning
ANALYZE profiles;
ANALYZE proposals;
ANALYZE clients;
ANALYZE notifications;
ANALYZE system_settings;
