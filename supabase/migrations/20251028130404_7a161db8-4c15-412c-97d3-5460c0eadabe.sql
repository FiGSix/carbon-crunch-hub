-- Create team_invitations table for email-based team member invitations
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invitation_token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX idx_team_invitations_company_id ON public.team_invitations(company_id);
CREATE INDEX idx_team_invitations_token ON public.team_invitations(invitation_token);
CREATE INDEX idx_team_invitations_status ON public.team_invitations(status);

-- Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Company members can view invitations for their company
CREATE POLICY "Company members can view team invitations"
  ON public.team_invitations
  FOR SELECT
  USING (
    company_id IN (SELECT user_company_ids(auth.uid()))
    OR is_current_user_admin()
  );

-- Policy: Team leads can create invitations for their company
CREATE POLICY "Team leads can create team invitations"
  ON public.team_invitations
  FOR INSERT
  WITH CHECK (
    is_team_lead(auth.uid(), company_id)
    OR is_current_user_admin()
  );

-- Policy: Team leads can update invitations (resend, cancel)
CREATE POLICY "Team leads can update team invitations"
  ON public.team_invitations
  FOR UPDATE
  USING (
    is_team_lead(auth.uid(), company_id)
    OR is_current_user_admin()
  );

-- Policy: System can update invitation status on acceptance
CREATE POLICY "System can update invitation acceptance"
  ON public.team_invitations
  FOR UPDATE
  USING (true);

-- Policy: Team leads can delete/cancel invitations
CREATE POLICY "Team leads can delete team invitations"
  ON public.team_invitations
  FOR DELETE
  USING (
    is_team_lead(auth.uid(), company_id)
    OR is_current_user_admin()
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_invitation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_team_invitations_updated_at
  BEFORE UPDATE ON public.team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_team_invitation_timestamp();

-- Function to get team invitations with inviter info
CREATE OR REPLACE FUNCTION get_pending_team_invitations(company_id_param UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  company_id UUID,
  invitation_token TEXT,
  invited_by UUID,
  inviter_name TEXT,
  status TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ti.id,
    ti.email,
    ti.first_name,
    ti.last_name,
    ti.company_id,
    ti.invitation_token,
    ti.invited_by,
    TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) as inviter_name,
    ti.status,
    ti.expires_at,
    ti.created_at
  FROM team_invitations ti
  LEFT JOIN profiles p ON p.id = ti.invited_by
  WHERE ti.company_id = company_id_param
    AND ti.status = 'pending'
    AND ti.expires_at > now()
  ORDER BY ti.created_at DESC;
END;
$$;