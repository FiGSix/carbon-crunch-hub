-- Fix infinite recursion between proposals and clients RLS policies
-- by using SECURITY DEFINER helper functions that bypass RLS

-- Step 1: Create helper function to get user's client IDs (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_client_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(ARRAY_AGG(id), ARRAY[]::uuid[]) FROM clients WHERE user_id = auth.uid();
$$;

-- Step 2: Create helper function to get client IDs from user's client companies (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_client_company_client_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(ARRAY_AGG(DISTINCT c.id), ARRAY[]::uuid[])
  FROM clients c
  WHERE c.client_company_id IN (
    SELECT ccm.client_company_id 
    FROM client_company_members ccm 
    WHERE ccm.user_id = auth.uid() 
      AND ccm.status = 'active'
  );
$$;

-- Step 3: Create helper function to check if agent has proposals with a client (bypasses RLS)
CREATE OR REPLACE FUNCTION public.agent_has_proposals_with_client(client_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.agent_id = auth.uid()
      AND p.deleted_at IS NULL
      AND (
        p.client_reference_id = client_id_param 
        OR p.client_id = (SELECT user_id FROM clients WHERE id = client_id_param)
      )
  );
$$;

-- Step 4: Update proposals RLS policy to use helper functions instead of subqueries
DROP POLICY IF EXISTS "proposals_select_policy" ON public.proposals;

CREATE POLICY "proposals_select_policy" ON public.proposals
FOR SELECT USING (
  deleted_at IS NULL
  AND (
    -- User is the agent
    agent_id = auth.uid()
    OR
    -- User is in same company as agent
    EXISTS (
      SELECT 1
      FROM company_members cm1
      JOIN company_members cm2 ON cm1.company_id = cm2.company_id
      WHERE cm1.user_id = auth.uid()
        AND cm2.user_id = agent_id
        AND cm1.status = 'active'
        AND cm2.status = 'active'
    )
    OR
    -- User is the client (direct match)
    client_id = auth.uid()
    OR
    -- User is the client reference (using helper function)
    client_reference_id = ANY(get_user_client_ids())
    OR
    -- User is member of same client_company (using helper function)
    client_reference_id = ANY(get_user_client_company_client_ids())
    OR
    -- User is admin
    is_current_user_admin()
    OR
    -- Valid token access
    (
      invitation_token IS NOT NULL
      AND invitation_expires_at > now()
      AND current_setting('request.invitation_token', true) = invitation_token
    )
  )
);

-- Step 5: Update clients RLS policies to use helper function instead of subqueries to proposals
DROP POLICY IF EXISTS "Agents can view clients from their proposals" ON public.clients;

CREATE POLICY "Agents can view clients from their proposals" ON public.clients
FOR SELECT USING (
  is_current_user_agent() 
  AND agent_has_proposals_with_client(id)
);

-- Step 6: Update agent update policy for clients
DROP POLICY IF EXISTS "Agents can update only their own clients" ON public.clients;

CREATE POLICY "Agents can update only their own clients" ON public.clients
FOR UPDATE USING (
  is_current_user_agent()
  AND (
    created_by = auth.uid()
    OR agent_has_proposals_with_client(id)
  )
);