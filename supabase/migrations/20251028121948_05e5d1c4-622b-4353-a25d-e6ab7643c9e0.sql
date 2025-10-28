-- Step 1: Create security definer function to get user's company IDs without triggering RLS
CREATE OR REPLACE FUNCTION public.user_company_ids(user_id_param UUID)
RETURNS TABLE(company_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT cm.company_id
  FROM company_members cm
  WHERE cm.user_id = user_id_param 
    AND cm.status = 'active';
$$;

-- Step 2: Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Members can view own company members" ON public.company_members;
DROP POLICY IF EXISTS "Members can invite new members" ON public.company_members;
DROP POLICY IF EXISTS "System can create team leads" ON public.company_members;

-- Step 3: Create new SELECT policy using the helper function
CREATE POLICY "Members can view own company members"
ON public.company_members
FOR SELECT
USING (
  is_current_user_admin()
  OR
  company_id IN (SELECT user_company_ids(auth.uid()))
);

-- Step 4: Create new INSERT policy for team lead creation during registration
CREATE POLICY "Users can create themselves as team lead"
ON public.company_members
FOR INSERT
WITH CHECK (
  role = 'team_lead' 
  AND status = 'active' 
  AND user_id = auth.uid()
);

-- Step 5: Create new INSERT policy for member invitations
CREATE POLICY "Members can invite new members"
ON public.company_members
FOR INSERT
WITH CHECK (
  invited_by = auth.uid()
  AND status = 'pending'
  AND company_id IN (SELECT user_company_ids(auth.uid()))
);