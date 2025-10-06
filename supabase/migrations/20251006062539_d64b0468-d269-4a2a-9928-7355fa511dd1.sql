-- Fix agent_activities RLS policies to prevent public access

-- Drop the overly permissive insert policy
DROP POLICY IF EXISTS "System can insert agent activities" ON public.agent_activities;

-- Create a more restrictive insert policy that requires authentication
-- Only authenticated users can insert their own activity records
CREATE POLICY "Authenticated users can insert own activities"
ON public.agent_activities
FOR INSERT
TO authenticated
WITH CHECK (agent_id = auth.uid());

-- Add explicit deny policies for UPDATE and DELETE to prevent any modifications
-- Agent activities should be immutable audit logs
CREATE POLICY "Deny all updates to agent activities"
ON public.agent_activities
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Deny all deletes from agent activities"
ON public.agent_activities
FOR DELETE
TO authenticated
USING (false);

-- Verify RLS is enabled (should already be enabled, but confirming)
ALTER TABLE public.agent_activities ENABLE ROW LEVEL SECURITY;