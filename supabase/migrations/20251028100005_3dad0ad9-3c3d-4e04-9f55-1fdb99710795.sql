-- Fix remaining search_path security warning on log_proposal_status_change

CREATE OR REPLACE FUNCTION public.log_proposal_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
      'info',
      'Proposal Status Updated',
      format('Proposal "%s" status changed from %s to %s', NEW.title, OLD.status, NEW.status),
      'proposal',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;