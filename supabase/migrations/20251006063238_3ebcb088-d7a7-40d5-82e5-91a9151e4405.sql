-- Fix clients table RLS to prevent agents from accessing other agents' client data
-- Remove the overly permissive policy that allows all agents to see all clients

-- Drop all existing policies on clients table to recreate them properly
DROP POLICY IF EXISTS "Clients can view own record" ON public.clients;
DROP POLICY IF EXISTS "clients_agent_manage" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_own_select" ON public.clients;
DROP POLICY IF EXISTS "clients_update_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_view_policy" ON public.clients;

-- Ensure RLS is enabled
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Add explicit DENY for anonymous users
CREATE POLICY "Block all anonymous access to clients"
ON public.clients
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- SELECT policies: Only view clients you created, are linked to, or if you're admin
CREATE POLICY "Agents can view clients they created"
ON public.clients
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid() OR 
  user_id = auth.uid() OR 
  is_current_user_admin()
);

-- INSERT policy: Only agents and admins can create clients
CREATE POLICY "Agents and admins can create clients"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  is_current_user_agent() OR 
  is_current_user_admin()
);

-- UPDATE policy: Only update clients you created, are linked to, or if you're admin
CREATE POLICY "Users can update own clients"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid() OR 
  user_id = auth.uid() OR 
  is_current_user_admin()
);

-- DELETE policy: Only delete clients you created or if you're admin
CREATE POLICY "Users can delete own clients"
ON public.clients
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid() OR 
  is_current_user_admin()
);