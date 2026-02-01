-- Create partner_invitations table to track pending partner invitations
CREATE TABLE public.partner_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  company_name text NOT NULL,
  contact_name text,
  invitation_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  requested_scopes jsonb DEFAULT '[]'::jsonb,
  environment text NOT NULL DEFAULT 'test',
  notes text,
  invited_by uuid REFERENCES public.profiles(id),
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL,
  partner_id uuid REFERENCES public.partners(id),
  created_at timestamptz DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE public.partner_invitations IS 'Tracks pending and accepted partner API invitations';

-- Create index for faster lookups by status and token
CREATE INDEX idx_partner_invitations_status ON public.partner_invitations(status);
CREATE INDEX idx_partner_invitations_token ON public.partner_invitations(invitation_token);
CREATE INDEX idx_partner_invitations_email ON public.partner_invitations(email);

-- Enable Row Level Security
ALTER TABLE public.partner_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can manage all partner invitations
CREATE POLICY "Admins can manage partner invitations"
  ON public.partner_invitations FOR ALL
  USING (is_current_user_admin());

-- System can insert invitations (for edge function with service role)
CREATE POLICY "System can insert partner invitations"
  ON public.partner_invitations FOR INSERT
  WITH CHECK (true);

-- System can update invitations (for marking as accepted)
CREATE POLICY "System can update partner invitations"
  ON public.partner_invitations FOR UPDATE
  USING (true);