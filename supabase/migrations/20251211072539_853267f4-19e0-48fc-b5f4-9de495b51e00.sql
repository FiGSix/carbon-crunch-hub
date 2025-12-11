-- Fix Blume Energy team visibility

-- Step 1: Update proposals RLS policy to include client company membership check
DROP POLICY IF EXISTS "proposals_select_policy" ON public.proposals;

CREATE POLICY "proposals_select_policy" ON public.proposals
FOR SELECT USING (
  -- Not deleted
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
    -- User is the client reference
    client_reference_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
    OR
    -- NEW: User is member of same client_company as the proposal's client
    EXISTS (
      SELECT 1 
      FROM client_company_members ccm
      WHERE ccm.user_id = auth.uid()
        AND ccm.status = 'active'
        AND ccm.client_company_id IN (
          -- Client company from client_reference_id
          SELECT c.client_company_id 
          FROM clients c 
          WHERE c.id = proposals.client_reference_id
            AND c.client_company_id IS NOT NULL
          UNION
          -- Client company from client_id's membership
          SELECT ccm2.client_company_id 
          FROM client_company_members ccm2 
          WHERE ccm2.user_id = proposals.client_id 
            AND ccm2.status = 'active'
        )
    )
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

-- Step 2: Link Justin's client record to the correct Blume Energy company
UPDATE clients 
SET client_company_id = '106ec14f-c7a7-4baf-8fe4-f9a1e171b3bf'
WHERE LOWER(email) = 'justin@blume.energy'
  AND client_company_id IS NULL;

-- Step 3: Move Mpho to the correct Blume Energy company
UPDATE client_company_members 
SET client_company_id = '106ec14f-c7a7-4baf-8fe4-f9a1e171b3bf'
WHERE user_id = '0c1abe9d-3ed6-4250-aaf6-997c47868f9a'
  AND client_company_id = '10fc9563-168e-4448-9a86-c79be37001f1';

-- Step 4: Delete the duplicate Blume Energy company (created from personal email)
DELETE FROM client_companies 
WHERE id = '10fc9563-168e-4448-9a86-c79be37001f1';