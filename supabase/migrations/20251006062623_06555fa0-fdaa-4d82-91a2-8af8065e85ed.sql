-- Fix agent_activities RLS to allow admin operations
-- The previous policy was too restrictive for admin/system operations

DROP POLICY IF EXISTS "Authenticated users can insert own activities" ON public.agent_activities;

-- Allow authenticated users to insert activities for agents they manage
-- Agents can insert their own activities
-- Admins can insert activities for any agent
CREATE POLICY "Users can insert agent activities"
ON public.agent_activities
FOR INSERT
TO authenticated
WITH CHECK (
  agent_id = auth.uid() OR 
  is_current_user_admin()
);