-- Update the profiles table RLS policy to allow admins to update any profile
-- while still restricting regular users to only update their own profiles

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

CREATE POLICY "profiles_update_policy" 
ON public.profiles 
FOR UPDATE 
USING (
  -- Users can update their own profiles OR admins can update any profile
  auth.uid() = id OR is_current_user_admin()
);