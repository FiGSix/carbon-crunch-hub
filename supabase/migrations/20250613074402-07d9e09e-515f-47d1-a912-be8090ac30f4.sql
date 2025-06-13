
-- First, let's check what constraints already exist and only add what's missing

-- Add foreign keys only if they don't exist
DO $$
BEGIN
    -- Add client_reference_id foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'proposals_client_reference_id_fkey' 
        AND table_name = 'proposals'
    ) THEN
        ALTER TABLE proposals 
        ADD CONSTRAINT proposals_client_reference_id_fkey 
        FOREIGN KEY (client_reference_id) REFERENCES clients(id) ON DELETE SET NULL;
    END IF;

    -- Add clients table foreign keys if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'clients_created_by_fkey' 
        AND table_name = 'clients'
    ) THEN
        ALTER TABLE clients 
        ADD CONSTRAINT clients_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;

    -- Add notifications foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notifications_user_id_fkey' 
        AND table_name = 'notifications'
    ) THEN
        ALTER TABLE notifications 
        ADD CONSTRAINT notifications_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Enable RLS on all tables (safe to run multiple times)
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Drop existing policies first to avoid conflicts, then recreate them
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
    DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
    DROP POLICY IF EXISTS "Users can view their own proposals" ON proposals;
    DROP POLICY IF EXISTS "Agents can create proposals" ON proposals;
    DROP POLICY IF EXISTS "Users can update their own proposals" ON proposals;
    DROP POLICY IF EXISTS "Users can delete their own proposals" ON proposals;
    DROP POLICY IF EXISTS "Agents can view clients they work with" ON clients;
    DROP POLICY IF EXISTS "Agents can create clients" ON clients;
    DROP POLICY IF EXISTS "Agents can update clients they work with" ON clients;
    DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
    DROP POLICY IF EXISTS "Admins can manage system settings" ON system_settings;
    DROP POLICY IF EXISTS "All users can read system settings" ON system_settings;
END $$;

-- RLS Policies for profiles table
CREATE POLICY "Users can view their own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
FOR SELECT USING (get_current_user_role() = 'admin');

-- RLS Policies for proposals table
CREATE POLICY "Users can view their own proposals" ON proposals
FOR SELECT USING (
  auth.uid() = agent_id OR 
  auth.uid() = client_id OR 
  get_current_user_role() = 'admin'
);

CREATE POLICY "Agents can create proposals" ON proposals
FOR INSERT WITH CHECK (
  auth.uid() = agent_id AND 
  get_current_user_role() IN ('agent', 'admin')
);

CREATE POLICY "Users can update their own proposals" ON proposals
FOR UPDATE USING (
  auth.uid() = agent_id OR 
  get_current_user_role() = 'admin'
);

CREATE POLICY "Users can delete their own proposals" ON proposals
FOR DELETE USING (
  auth.uid() = agent_id OR 
  get_current_user_role() = 'admin'
);

-- RLS Policies for clients table
CREATE POLICY "Agents can view clients they work with" ON clients
FOR SELECT USING (
  get_current_user_role() = 'admin' OR
  (get_current_user_role() = 'agent' AND EXISTS(
    SELECT 1 FROM proposals p WHERE p.client_reference_id = clients.id AND p.agent_id = auth.uid()
  )) OR
  auth.uid() = user_id
);

CREATE POLICY "Agents can create clients" ON clients
FOR INSERT WITH CHECK (
  get_current_user_role() IN ('agent', 'admin')
);

CREATE POLICY "Agents can update clients they work with" ON clients
FOR UPDATE USING (
  get_current_user_role() = 'admin' OR
  (get_current_user_role() = 'agent' AND EXISTS(
    SELECT 1 FROM proposals p WHERE p.client_reference_id = clients.id AND p.agent_id = auth.uid()
  ))
);

-- RLS Policies for notifications table
CREATE POLICY "Users can view their own notifications" ON notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for system_settings table
CREATE POLICY "Admins can manage system settings" ON system_settings
FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "All users can read system settings" ON system_settings
FOR SELECT USING (true);
