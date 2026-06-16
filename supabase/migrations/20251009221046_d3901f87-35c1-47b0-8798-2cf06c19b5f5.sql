-- Security Fix: Restrict agent access to clients
-- Agents should only see clients they created or clients associated with their proposals

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Agents and admins can view all clients" ON public.clients;

-- Create granular policies for SELECT access
CREATE POLICY "Admins can view all clients"
ON public.clients
FOR SELECT
USING (is_current_user_admin());

CREATE POLICY "Agents can view clients they created"
ON public.clients
FOR SELECT
USING (
  is_current_user_agent() 
  AND created_by = auth.uid()
);

CREATE POLICY "Agents can view clients from their proposals"
ON public.clients
FOR SELECT
USING (
  is_current_user_agent()
  AND EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.agent_id = auth.uid()
    AND (p.client_reference_id = clients.id OR p.client_id = clients.user_id)
    AND p.deleted_at IS NULL
  )
);

CREATE POLICY "Users can view their own client profile"
ON public.clients
FOR SELECT
USING (user_id = auth.uid());

-- Keep existing update/delete policies as they are already properly scoped