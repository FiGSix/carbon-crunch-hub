-- =====================================================
-- AGENT HIERARCHY: COMPANIES & TEAM MANAGEMENT
-- =====================================================

-- Companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL UNIQUE,
  email_domain TEXT, -- auto-detected for corporate emails
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Company members table with roles (team_lead or member)
CREATE TABLE IF NOT EXISTS public.company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('team_lead', 'member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'declined')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_domain ON public.companies(email_domain);
CREATE INDEX IF NOT EXISTS idx_company_members_company ON public.company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user ON public.company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_status ON public.company_members(status);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Check if user is team lead of a company
CREATE OR REPLACE FUNCTION public.is_team_lead(user_id_param UUID, company_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members
    WHERE user_id = user_id_param
      AND company_id = company_id_param
      AND role = 'team_lead'
      AND status = 'active'
  );
$$;

-- Check if user is member of a company (any role)
CREATE OR REPLACE FUNCTION public.is_company_member(user_id_param UUID, company_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members
    WHERE user_id = user_id_param
      AND company_id = company_id_param
      AND status = 'active'
  );
$$;

-- Get user's company ID
CREATE OR REPLACE FUNCTION public.get_user_company_id(user_id_param UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.company_members
  WHERE user_id = user_id_param
    AND status = 'active'
  LIMIT 1;
$$;

-- Extract email domain (returns NULL for personal emails)
CREATE OR REPLACE FUNCTION public.extract_corporate_domain(email_param TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  domain TEXT;
  personal_domains TEXT[] := ARRAY['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'me.com'];
BEGIN
  -- Extract domain from email
  domain := LOWER(SPLIT_PART(email_param, '@', 2));
  
  -- Return NULL if it's a personal email domain
  IF domain = ANY(personal_domains) THEN
    RETURN NULL;
  END IF;
  
  RETURN domain;
END;
$$;

-- =====================================================
-- RLS POLICIES - COMPANIES
-- =====================================================

-- Agents can view their own company
CREATE POLICY "Agents can view own company"
ON public.companies
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Admins can view all companies
CREATE POLICY "Admins can view all companies"
ON public.companies
FOR SELECT
TO authenticated
USING (is_current_user_admin());

-- System can insert companies (used during registration)
CREATE POLICY "System can insert companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Team leads and admins can update company info
CREATE POLICY "Team leads can update company"
ON public.companies
FOR UPDATE
TO authenticated
USING (
  is_team_lead(auth.uid(), id) OR is_current_user_admin()
);

-- =====================================================
-- RLS POLICIES - COMPANY MEMBERS
-- =====================================================

-- Members can view their own company's members
CREATE POLICY "Members can view own company members"
ON public.company_members
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Admins can view all members
CREATE POLICY "Admins can view all members"
ON public.company_members
FOR SELECT
TO authenticated
USING (is_current_user_admin());

-- Members can invite new members (insert with pending status)
CREATE POLICY "Members can invite new members"
ON public.company_members
FOR INSERT
TO authenticated
WITH CHECK (
  invited_by = auth.uid() AND
  status = 'pending' AND
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- System can create team lead memberships (during registration)
CREATE POLICY "System can create team leads"
ON public.company_members
FOR INSERT
TO authenticated
WITH CHECK (
  role = 'team_lead' AND
  status = 'active' AND
  user_id = auth.uid()
);

-- Team leads can approve/decline pending members
CREATE POLICY "Team leads can update member status"
ON public.company_members
FOR UPDATE
TO authenticated
USING (
  is_team_lead(auth.uid(), company_id)
)
WITH CHECK (
  is_team_lead(auth.uid(), company_id)
);

-- Admins can update any member (for team lead succession)
CREATE POLICY "Admins can update any member"
ON public.company_members
FOR UPDATE
TO authenticated
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

-- =====================================================
-- UPDATE PROPOSALS RLS FOR COMPANY VISIBILITY
-- =====================================================

-- Drop existing agent select policy if exists
DROP POLICY IF EXISTS "Agents can view proposals from company members" ON public.proposals;

-- Add new policy for company-wide project visibility
CREATE POLICY "Agents can view company proposals"
ON public.proposals
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL AND (
    -- Own proposals
    agent_id = auth.uid() OR
    -- Proposals from company members
    agent_id IN (
      SELECT cm.user_id 
      FROM public.company_members cm
      WHERE cm.company_id = public.get_user_company_id(auth.uid())
        AND cm.status = 'active'
    ) OR
    -- Admin access
    is_current_user_admin() OR
    -- Client access
    client_id = auth.uid() OR
    is_proposal_client(client_reference_id) OR
    -- Token access
    (invitation_token IS NOT NULL AND invitation_expires_at > now() AND 
     current_setting('request.invitation_token', true) = invitation_token)
  )
);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION public.update_company_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_company_updated_at();

CREATE TRIGGER update_company_members_updated_at
BEFORE UPDATE ON public.company_members
FOR EACH ROW
EXECUTE FUNCTION public.update_company_updated_at();

-- Notify admins when member status changes
CREATE OR REPLACE FUNCTION public.notify_team_lead_on_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  team_lead_record RECORD;
  inviter_name TEXT;
BEGIN
  -- Only notify on new pending invitations
  IF NEW.status = 'pending' AND OLD.status IS NULL THEN
    
    -- Get inviter name
    SELECT CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) 
    INTO inviter_name
    FROM public.profiles
    WHERE id = NEW.invited_by;
    
    -- Notify all team leads of this company
    FOR team_lead_record IN 
      SELECT user_id FROM public.company_members 
      WHERE company_id = NEW.company_id 
        AND role = 'team_lead' 
        AND status = 'active'
    LOOP
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        related_type,
        related_id
      ) VALUES (
        team_lead_record.user_id,
        'info',
        'New Team Member Request',
        format('%s has requested to join your team and needs approval.', 
          COALESCE(inviter_name, 'A new agent')
        ),
        'company_member',
        NEW.id
      );
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_member_invite
AFTER INSERT ON public.company_members
FOR EACH ROW
EXECUTE FUNCTION public.notify_team_lead_on_invite();