-- Fix circular dependency in clients table policies
-- The clients_agent_select policy queries proposals table which creates circular dependency

-- Drop the problematic function and policy that's causing recursion
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;

-- Update policies on clients table to remove circular dependencies
DROP POLICY IF EXISTS "clients_agent_select" ON clients;
DROP POLICY IF EXISTS "Agents and admins can view all clients" ON clients;
DROP POLICY IF EXISTS "Agents and admins can insert clients" ON clients;

-- Create new streamlined policies for clients table
CREATE POLICY "clients_view_policy" ON clients
FOR SELECT USING (
  user_id = auth.uid() OR 
  created_by = auth.uid() OR 
  public.is_current_user_admin() OR
  public.is_current_user_agent()
);

CREATE POLICY "clients_insert_policy" ON clients
FOR INSERT WITH CHECK (
  public.is_current_user_agent() OR 
  public.is_current_user_admin()
);

CREATE POLICY "clients_update_policy" ON clients
FOR UPDATE USING (
  user_id = auth.uid() OR 
  created_by = auth.uid() OR 
  public.is_current_user_admin()
);

CREATE POLICY "clients_delete_policy" ON clients
FOR DELETE USING (
  created_by = auth.uid() OR 
  public.is_current_user_admin()
);