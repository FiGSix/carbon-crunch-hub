-- Create agent_invitations table
CREATE TABLE public.agent_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  invitation_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.agent_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_invitations
CREATE POLICY "Admins can view all invitations"
  ON public.agent_invitations FOR SELECT
  TO authenticated
  USING (public.is_current_user_admin());

CREATE POLICY "Admins can insert invitations"
  ON public.agent_invitations FOR INSERT
  TO authenticated
  WITH CHECK (public.is_current_user_admin());

CREATE POLICY "System can update invitations"
  ON public.agent_invitations FOR UPDATE
  TO authenticated
  USING (true);

-- Indexes for performance
CREATE INDEX idx_agent_invitations_token ON public.agent_invitations(invitation_token);
CREATE INDEX idx_agent_invitations_email ON public.agent_invitations(email);
CREATE INDEX idx_agent_invitations_status ON public.agent_invitations(status);

-- Create user_role_audit table for tracking role changes
CREATE TABLE public.user_role_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role app_role NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('added', 'removed')),
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_role_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_role_audit
CREATE POLICY "Admins can view audit logs"
  ON public.user_role_audit FOR SELECT
  TO authenticated
  USING (public.is_current_user_admin());

CREATE POLICY "System can insert audit logs"
  ON public.user_role_audit FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Index for audit queries
CREATE INDEX idx_user_role_audit_user_id ON public.user_role_audit(user_id);
CREATE INDEX idx_user_role_audit_performed_by ON public.user_role_audit(performed_by);