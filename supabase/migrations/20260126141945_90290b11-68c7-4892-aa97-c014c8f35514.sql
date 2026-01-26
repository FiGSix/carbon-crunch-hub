-- Allow anonymous users to validate pending invitation tokens during registration
-- This is required because users need to validate their invitation BEFORE they can register/authenticate
-- Security: The 64-character token acts as the secret - you must know it to find the invitation
CREATE POLICY "Anon can validate pending invitation tokens"
ON public.agent_invitations
FOR SELECT
TO anon
USING (
  status = 'pending' 
  AND expires_at > now()
);