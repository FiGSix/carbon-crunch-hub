-- Add missing updated_at column to proposals table
ALTER TABLE public.proposals 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create index on updated_at for performance
CREATE INDEX IF NOT EXISTS idx_proposals_updated_at ON public.proposals(updated_at);

-- Update the trigger function to handle updated_at properly
CREATE OR REPLACE FUNCTION public.update_modified_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_modified_by = auth.uid();
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists on proposals table
DROP TRIGGER IF EXISTS update_proposals_modified_columns ON public.proposals;
CREATE TRIGGER update_proposals_modified_columns
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_modified_columns();

-- Add audit trail function for status changes
CREATE OR REPLACE FUNCTION public.log_proposal_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      related_type,
      related_id
    ) VALUES (
      NEW.agent_id,
      'proposal_status_changed',
      'Proposal Status Updated',
      format('Proposal "%s" status changed from %s to %s', NEW.title, OLD.status, NEW.status),
      'proposal',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for status change logging
DROP TRIGGER IF EXISTS log_proposal_status_change_trigger ON public.proposals;
CREATE TRIGGER log_proposal_status_change_trigger
  AFTER UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.log_proposal_status_change();

-- Update existing proposals to have updated_at value
UPDATE public.proposals 
SET updated_at = created_at 
WHERE updated_at IS NULL;