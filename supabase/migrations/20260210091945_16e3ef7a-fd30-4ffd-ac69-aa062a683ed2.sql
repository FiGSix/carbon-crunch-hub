
-- Create client_invitations table
CREATE TABLE public.client_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  invitation_token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES public.profiles(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_pending_client_email UNIQUE (email)
);

ALTER TABLE public.client_invitations ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can invite
CREATE POLICY "Authenticated users can insert client invitations"
  ON public.client_invitations FOR INSERT
  TO authenticated
  WITH CHECK (invited_by = auth.uid());

-- Users can see their own invitations
CREATE POLICY "Users can view own sent invitations"
  ON public.client_invitations FOR SELECT
  TO authenticated
  USING (invited_by = auth.uid());

-- Admins can see all
CREATE POLICY "Admins can view all client invitations"
  ON public.client_invitations FOR SELECT
  TO authenticated
  USING (public.is_current_user_admin());

-- Anon can validate tokens (for registration)
CREATE POLICY "Anon can validate pending client invitation tokens"
  ON public.client_invitations FOR SELECT
  TO anon
  USING (status = 'pending' AND expires_at > now());

-- Allow status updates
CREATE POLICY "System can update client invitations"
  ON public.client_invitations FOR UPDATE
  TO authenticated
  USING (true);

-- Indexes
CREATE INDEX idx_client_invitations_token ON public.client_invitations(invitation_token);
CREATE INDEX idx_client_invitations_email ON public.client_invitations(email);
CREATE INDEX idx_client_invitations_status ON public.client_invitations(status);
CREATE INDEX idx_client_invitations_invited_by ON public.client_invitations(invited_by);

-- Auto-accept invitation when client profile is created
CREATE OR REPLACE FUNCTION public.handle_client_invitation_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'client' THEN
    UPDATE public.client_invitations
    SET status = 'accepted'
    WHERE LOWER(email) = LOWER(NEW.email)
    AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_client_profile_created_accept_invitation
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_client_invitation_acceptance();
