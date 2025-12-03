-- =============================================
-- CLIENT TEAM MANAGEMENT SCHEMA
-- =============================================

-- Create client_companies table
CREATE TABLE public.client_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  registration_number TEXT,
  email_domain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create client_company_members table
CREATE TABLE public.client_company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_company_id UUID NOT NULL REFERENCES public.client_companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('account_admin', 'member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'declined')),
  can_sign_agreements BOOLEAN NOT NULL DEFAULT false,
  invited_by UUID,
  approved_by UUID,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_company_id, user_id)
);

-- Create client_team_invitations table
CREATE TABLE public.client_team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  client_company_id UUID NOT NULL REFERENCES public.client_companies(id) ON DELETE CASCADE,
  invitation_token TEXT NOT NULL UNIQUE,
  invited_by UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add client_company_id to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS client_company_id UUID REFERENCES public.client_companies(id);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Get client user's company ID
CREATE OR REPLACE FUNCTION public.get_client_user_company_id(user_id_param UUID)
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_company_id
  FROM public.client_company_members
  WHERE user_id = user_id_param
    AND status = 'active'
  LIMIT 1;
$$;

-- Check if user is a client company member
CREATE OR REPLACE FUNCTION public.is_client_company_member(user_id_param UUID, company_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_company_members
    WHERE user_id = user_id_param
      AND client_company_id = company_id_param
      AND status = 'active'
  );
$$;

-- Check if user is client account admin
CREATE OR REPLACE FUNCTION public.is_client_account_admin(user_id_param UUID, company_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_company_members
    WHERE user_id = user_id_param
      AND client_company_id = company_id_param
      AND role = 'account_admin'
      AND status = 'active'
  );
$$;

-- Check if current user is client account admin of their company
CREATE OR REPLACE FUNCTION public.is_current_user_client_account_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_company_members
    WHERE user_id = auth.uid()
      AND role = 'account_admin'
      AND status = 'active'
  );
$$;

-- Get user's client company IDs
CREATE OR REPLACE FUNCTION public.user_client_company_ids(user_id_param UUID)
RETURNS TABLE(client_company_id UUID)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT DISTINCT ccm.client_company_id
  FROM public.client_company_members ccm
  WHERE ccm.user_id = user_id_param 
    AND ccm.status = 'active';
$$;

-- =============================================
-- ENABLE RLS
-- =============================================

ALTER TABLE public.client_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_team_invitations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - client_companies
-- =============================================

-- Admins can view all client companies
CREATE POLICY "Admins can view all client companies"
ON public.client_companies FOR SELECT
USING (is_current_user_admin());

-- Members can view own company
CREATE POLICY "Members can view own client company"
ON public.client_companies FOR SELECT
USING (id IN (SELECT user_client_company_ids(auth.uid())));

-- System/admins can insert companies
CREATE POLICY "System can insert client companies"
ON public.client_companies FOR INSERT
WITH CHECK (true);

-- Account admins can update their company
CREATE POLICY "Account admins can update client company"
ON public.client_companies FOR UPDATE
USING (is_client_account_admin(auth.uid(), id) OR is_current_user_admin());

-- =============================================
-- RLS POLICIES - client_company_members
-- =============================================

-- Admins can view all members
CREATE POLICY "Admins can view all client company members"
ON public.client_company_members FOR SELECT
USING (is_current_user_admin());

-- Members can view own company members
CREATE POLICY "Members can view own client company members"
ON public.client_company_members FOR SELECT
USING (client_company_id IN (SELECT user_client_company_ids(auth.uid())));

-- Account admins can insert members (invite)
CREATE POLICY "Account admins can insert client company members"
ON public.client_company_members FOR INSERT
WITH CHECK (
  (invited_by = auth.uid() AND status = 'pending' AND client_company_id IN (SELECT user_client_company_ids(auth.uid())))
  OR is_current_user_admin()
);

-- Users can create themselves as account_admin (first member of company)
CREATE POLICY "Users can create themselves as account admin"
ON public.client_company_members FOR INSERT
WITH CHECK (
  role = 'account_admin' AND status = 'active' AND user_id = auth.uid()
);

-- Account admins can update member status
CREATE POLICY "Account admins can update client company members"
ON public.client_company_members FOR UPDATE
USING (is_client_account_admin(auth.uid(), client_company_id) OR is_current_user_admin());

-- Account admins can delete members
CREATE POLICY "Account admins can delete client company members"
ON public.client_company_members FOR DELETE
USING (is_client_account_admin(auth.uid(), client_company_id) OR is_current_user_admin());

-- =============================================
-- RLS POLICIES - client_team_invitations
-- =============================================

-- Admins can view all invitations
CREATE POLICY "Admins can view all client team invitations"
ON public.client_team_invitations FOR SELECT
USING (is_current_user_admin());

-- Members can view own company invitations
CREATE POLICY "Members can view own client company invitations"
ON public.client_team_invitations FOR SELECT
USING (client_company_id IN (SELECT user_client_company_ids(auth.uid())));

-- Account admins can insert invitations
CREATE POLICY "Account admins can insert client team invitations"
ON public.client_team_invitations FOR INSERT
WITH CHECK (
  (invited_by = auth.uid() AND client_company_id IN (SELECT user_client_company_ids(auth.uid())))
  OR is_current_user_admin()
);

-- System can update invitations (for acceptance)
CREATE POLICY "System can update client team invitations"
ON public.client_team_invitations FOR UPDATE
USING (true);

-- Account admins can delete invitations (cancel)
CREATE POLICY "Account admins can delete client team invitations"
ON public.client_team_invitations FOR DELETE
USING (is_client_account_admin(auth.uid(), client_company_id) OR is_current_user_admin());

-- =============================================
-- UPDATE TRIGGERS
-- =============================================

CREATE TRIGGER update_client_companies_updated_at
BEFORE UPDATE ON public.client_companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_company_members_updated_at
BEFORE UPDATE ON public.client_company_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_team_invitations_updated_at
BEFORE UPDATE ON public.client_team_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_client_company_members_user_id ON public.client_company_members(user_id);
CREATE INDEX idx_client_company_members_company_id ON public.client_company_members(client_company_id);
CREATE INDEX idx_client_team_invitations_email ON public.client_team_invitations(email);
CREATE INDEX idx_client_team_invitations_token ON public.client_team_invitations(invitation_token);
CREATE INDEX idx_clients_client_company_id ON public.clients(client_company_id);