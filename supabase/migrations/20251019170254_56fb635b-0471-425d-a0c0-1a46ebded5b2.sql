-- Fix solar_installers public exposure by requiring authentication for SELECT
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all installers" ON public.solar_installers;

-- Create a new policy that requires authentication
CREATE POLICY "Authenticated users can view installers"
ON public.solar_installers
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);