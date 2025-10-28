-- Allow admins to insert into company_members table
CREATE POLICY "Admins can insert members"
ON public.company_members
FOR INSERT
WITH CHECK (is_current_user_admin());