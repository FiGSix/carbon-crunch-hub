
-- Fix missing unit_standard column in proposals table (only if it doesn't exist)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'unit_standard') THEN
        ALTER TABLE proposals ADD COLUMN unit_standard text DEFAULT 'kWp';
        COMMENT ON COLUMN proposals.unit_standard IS 'Unit of measurement for system size (kWp, MWp, etc.)';
    END IF;
END $$;

-- Create index for performance (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_proposals_unit_standard ON proposals(unit_standard);

-- Update existing proposals to have the default unit
UPDATE proposals 
SET unit_standard = 'kWp' 
WHERE unit_standard IS NULL;

-- Enable RLS on tables (safe to run if already enabled)
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing conflicting policies first, then recreate them
DROP POLICY IF EXISTS "Agents can create proposals" ON proposals;
DROP POLICY IF EXISTS "Clients can view their own proposals" ON proposals;
DROP POLICY IF EXISTS "Agents can manage their own proposals" ON proposals;

-- Recreate proposals policies
CREATE POLICY "Clients can view their own proposals" ON proposals
FOR SELECT USING (
  auth.uid() = client_id OR 
  auth.uid() = client_reference_id OR
  EXISTS(SELECT 1 FROM clients WHERE id = client_reference_id AND user_id = auth.uid())
);

CREATE POLICY "Agents can manage their own proposals" ON proposals
FOR ALL USING (
  auth.uid() = agent_id OR
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Agents can create proposals" ON proposals
FOR INSERT WITH CHECK (
  auth.uid() = agent_id AND
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('agent', 'admin'))
);

-- Add clients table policies (drop existing if any)
DROP POLICY IF EXISTS "Users can view relevant clients" ON clients;
DROP POLICY IF EXISTS "Agents can manage clients" ON clients;

CREATE POLICY "Users can view relevant clients" ON clients
FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('agent', 'admin')) OR
  user_id = auth.uid()
);

CREATE POLICY "Agents can manage clients" ON clients
FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('agent', 'admin'))
);

-- Add notifications table policies (drop existing if any)
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

CREATE POLICY "Users can view their own notifications" ON notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON notifications
FOR INSERT WITH CHECK (true);

-- Add profiles table policies (drop existing if any)
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "System can create profiles" ON profiles;

CREATE POLICY "Users can view profiles" ON profiles
FOR SELECT USING (
  auth.uid() = id OR
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "System can create profiles" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);
