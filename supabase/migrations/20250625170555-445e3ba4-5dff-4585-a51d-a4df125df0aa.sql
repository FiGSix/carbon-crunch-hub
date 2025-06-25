
-- STEP 1: Clean Up ALL RLS Policies (with proper CASCADE)
-- Drop all existing policies completely
DO $$
BEGIN
    -- Drop all existing policies on profiles
    DROP POLICY IF EXISTS "Users can view their own profile" ON profiles CASCADE;
    DROP POLICY IF EXISTS "Users can update their own profile" ON profiles CASCADE;
    DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles CASCADE;
    DROP POLICY IF EXISTS "Users can view own profile or admins see all" ON profiles CASCADE;
    DROP POLICY IF EXISTS "System can create profiles" ON profiles CASCADE;
    DROP POLICY IF EXISTS "profiles_select_policy" ON profiles CASCADE;
    DROP POLICY IF EXISTS "profiles_update_policy" ON profiles CASCADE;
    DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles CASCADE;
    
    -- Drop all existing policies on proposals
    DROP POLICY IF EXISTS "Users can view their own proposals" ON proposals CASCADE;
    DROP POLICY IF EXISTS "Agents can create proposals" ON proposals CASCADE;
    DROP POLICY IF EXISTS "Users can update their own proposals" ON proposals CASCADE;
    DROP POLICY IF EXISTS "Users can delete their own proposals" ON proposals CASCADE;
    DROP POLICY IF EXISTS "Clients can view their own proposals" ON proposals CASCADE;
    DROP POLICY IF EXISTS "Agents can manage their own proposals" ON proposals CASCADE;
    DROP POLICY IF EXISTS "Users can view relevant proposals" ON proposals CASCADE;
    DROP POLICY IF EXISTS "Agents can update proposals" ON proposals CASCADE;
    DROP POLICY IF EXISTS "Authorized users can delete proposals" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_select_policy" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_insert_policy" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_update_policy" ON proposals CASCADE;
    DROP POLICY IF EXISTS "proposals_delete_policy" ON proposals CASCADE;
    
    -- Drop all existing policies on clients
    DROP POLICY IF EXISTS "Agents can view clients they work with" ON clients CASCADE;
    DROP POLICY IF EXISTS "Agents can create clients" ON clients CASCADE;
    DROP POLICY IF EXISTS "Agents can update clients they work with" ON clients CASCADE;
    DROP POLICY IF EXISTS "Users can view relevant clients" ON clients CASCADE;
    DROP POLICY IF EXISTS "Agents can manage clients" ON clients CASCADE;
    DROP POLICY IF EXISTS "Agents can view and manage clients" ON clients CASCADE;
    DROP POLICY IF EXISTS "Agents can update clients" ON clients CASCADE;
    DROP POLICY IF EXISTS "Agents can delete clients" ON clients CASCADE;
    DROP POLICY IF EXISTS "clients_select_policy" ON clients CASCADE;
    DROP POLICY IF EXISTS "clients_insert_policy" ON clients CASCADE;
    DROP POLICY IF EXISTS "clients_update_policy" ON clients CASCADE;
    DROP POLICY IF EXISTS "clients_delete_policy" ON clients CASCADE;
    
    -- Drop all existing policies on notifications
    DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications CASCADE;
    DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications CASCADE;
    DROP POLICY IF EXISTS "System can create notifications" ON notifications CASCADE;
    DROP POLICY IF EXISTS "Users can view own notifications" ON notifications CASCADE;
    DROP POLICY IF EXISTS "notifications_select_policy" ON notifications CASCADE;
    DROP POLICY IF EXISTS "notifications_update_policy" ON notifications CASCADE;
    DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications CASCADE;
    
    -- Drop all existing policies on system_settings
    DROP POLICY IF EXISTS "Admins can manage system settings" ON system_settings CASCADE;
    DROP POLICY IF EXISTS "All users can read system settings" ON system_settings CASCADE;
    DROP POLICY IF EXISTS "system_settings_all_policy" ON system_settings CASCADE;
    DROP POLICY IF EXISTS "system_settings_select_policy" ON system_settings CASCADE;
END $$;

-- STEP 2: Recreate Clean Helper Functions
-- Create a clean, consistent role checking function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Create helper function to check if user has admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- Create helper function to check if user has agent role
CREATE OR REPLACE FUNCTION public.is_agent()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('agent', 'admin'));
$$;

-- STEP 3: Create Clean, Non-Conflicting RLS Policies

-- PROFILES TABLE POLICIES
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT USING (
  auth.uid() = id OR public.is_admin()
);

CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- PROPOSALS TABLE POLICIES
CREATE POLICY "proposals_select_policy" ON proposals
FOR SELECT USING (
  auth.uid() = agent_id OR 
  auth.uid() = client_id OR 
  auth.uid() IN (SELECT user_id FROM clients WHERE id = client_reference_id) OR
  public.is_admin()
);

CREATE POLICY "proposals_insert_policy" ON proposals
FOR INSERT WITH CHECK (
  auth.uid() = agent_id AND public.is_agent()
);

CREATE POLICY "proposals_update_policy" ON proposals
FOR UPDATE USING (
  auth.uid() = agent_id OR public.is_admin()
);

CREATE POLICY "proposals_delete_policy" ON proposals
FOR DELETE USING (
  auth.uid() = agent_id OR 
  auth.uid() = client_id OR 
  auth.uid() IN (SELECT user_id FROM clients WHERE id = client_reference_id) OR
  public.is_admin()
);

-- CLIENTS TABLE POLICIES
CREATE POLICY "clients_select_policy" ON clients
FOR SELECT USING (
  public.is_agent() OR 
  auth.uid() = user_id
);

CREATE POLICY "clients_insert_policy" ON clients
FOR INSERT WITH CHECK (public.is_agent());

CREATE POLICY "clients_update_policy" ON clients
FOR UPDATE USING (public.is_agent());

CREATE POLICY "clients_delete_policy" ON clients
FOR DELETE USING (public.is_agent());

-- NOTIFICATIONS TABLE POLICIES
CREATE POLICY "notifications_select_policy" ON notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_policy" ON notifications
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_policy" ON notifications
FOR INSERT WITH CHECK (true);

-- SYSTEM_SETTINGS TABLE POLICIES
CREATE POLICY "system_settings_all_policy" ON system_settings
FOR ALL USING (public.is_admin());

CREATE POLICY "system_settings_select_policy" ON system_settings
FOR SELECT USING (true);
