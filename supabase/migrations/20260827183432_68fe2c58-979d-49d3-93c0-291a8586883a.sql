CREATE POLICY "Admins can delete company members"
ON public.company_members
FOR DELETE
USING (public.is_current_user_admin());

CREATE POLICY "Team leads can delete their company members"
ON public.company_members
FOR DELETE
USING (public.is_team_lead(auth.uid(), company_id) AND role <> 'team_lead');