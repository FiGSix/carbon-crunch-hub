-- Fix the proposal status change trigger to use a valid notification type
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
      'info',  -- Changed from 'proposal_status_changed' to 'info'
      'Proposal Status Updated',
      format('Proposal "%s" status changed from %s to %s', NEW.title, OLD.status, NEW.status),
      'proposal',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;