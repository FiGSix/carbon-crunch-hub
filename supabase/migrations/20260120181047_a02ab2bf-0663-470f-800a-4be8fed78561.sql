-- Enhanced mark_invitation_viewed function
-- Now also updates status to 'viewed' as fallback for when Resend webhooks don't fire
CREATE OR REPLACE FUNCTION public.mark_invitation_viewed(token_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  proposal_id_val uuid;
  current_status text;
BEGIN
  -- Get proposal ID and current status
  SELECT id, status INTO proposal_id_val, current_status
  FROM proposals
  WHERE invitation_token = token_param;
  
  -- Exit if proposal not found
  IF proposal_id_val IS NULL THEN
    RETURN;
  END IF;
  
  -- Update invitation_viewed_at if not already set
  UPDATE proposals
  SET invitation_viewed_at = now()
  WHERE invitation_token = token_param
  AND invitation_viewed_at IS NULL;
  
  -- Update status to 'viewed' if currently in an actionable pre-view state
  -- This provides a fallback when Resend webhooks don't fire (email client blocking, etc.)
  IF current_status IN ('pending', 'sent', 'delivered', 'opened') THEN
    -- Use the existing RPC for proper logging
    PERFORM update_proposal_status_with_log(
      proposal_id_val,
      'viewed',
      'page_view',
      true
    );
  END IF;
END;
$function$;