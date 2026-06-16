-- Add RLS policy to allow agents to search all clients by email
-- This prevents duplicate client records when multiple agents work with the same client
CREATE POLICY "Agents can search clients by email"
ON public.clients
FOR SELECT
TO authenticated
USING (
  is_current_user_agent() 
  AND email IS NOT NULL
);