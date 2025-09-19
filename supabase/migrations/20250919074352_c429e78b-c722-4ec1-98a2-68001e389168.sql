-- Update the profiles delete policy to allow admins to delete agent profiles
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

CREATE POLICY "profiles_delete_policy" 
ON public.profiles 
FOR DELETE 
USING (
  auth.uid() = id OR 
  (is_current_user_admin() AND role = 'agent')
);