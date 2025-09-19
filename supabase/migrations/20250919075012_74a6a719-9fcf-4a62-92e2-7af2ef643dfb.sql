-- Fix foreign key constraint to allow agent deletion
-- Drop existing foreign key constraint
ALTER TABLE public.proposals 
DROP CONSTRAINT IF EXISTS proposals_agent_id_fkey;

-- Add the constraint back with ON DELETE SET NULL
-- This preserves proposals when an agent is deleted, just sets agent_id to NULL
ALTER TABLE public.proposals 
ADD CONSTRAINT proposals_agent_id_fkey 
FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE SET NULL;