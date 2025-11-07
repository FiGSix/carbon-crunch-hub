-- Phase 1: Create email_events table for tracking Resend webhook events

CREATE TABLE public.email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  
  -- Resend webhook data
  event_type text NOT NULL CHECK (event_type IN (
    'email.sent', 
    'email.delivered', 
    'email.delivered_delayed',
    'email.opened', 
    'email.clicked', 
    'email.bounced', 
    'email.complained'
  )),
  message_id text NOT NULL, -- Resend message ID
  
  -- Email details
  recipient_email text NOT NULL,
  subject text,
  
  -- Event metadata
  occurred_at timestamp with time zone NOT NULL,
  user_agent text,
  ip_address inet,
  click_url text, -- For click events
  bounce_reason text, -- For bounce events
  
  -- Raw webhook payload
  raw_payload jsonb NOT NULL DEFAULT '{}',
  
  -- Tracking
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  status_update_triggered boolean DEFAULT false
);

-- Indexes for performance
CREATE INDEX idx_email_events_proposal ON email_events(proposal_id);
CREATE INDEX idx_email_events_type ON email_events(event_type);
CREATE INDEX idx_email_events_occurred ON email_events(occurred_at DESC);
CREATE INDEX idx_email_events_message_id ON email_events(message_id);

-- RLS Policies
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view email events for their proposals"
ON public.email_events FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = email_events.proposal_id
      AND (p.agent_id = auth.uid() OR is_current_user_admin())
  )
);

CREATE POLICY "System can insert email events"
ON public.email_events FOR INSERT
TO service_role
WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.email_events TO authenticated;
GRANT INSERT ON public.email_events TO service_role;

COMMENT ON TABLE public.email_events IS 'Tracks all email events from Resend webhooks for proposal invitations';
COMMENT ON COLUMN public.email_events.event_type IS 'Type of email event from Resend (sent, delivered, opened, clicked, bounced, complained)';
COMMENT ON COLUMN public.email_events.message_id IS 'Unique message ID from Resend for tracking';

-- Create proposal_automation_log table for tracking all automated actions

CREATE TABLE public.proposal_automation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  
  -- Automation details
  automation_type text NOT NULL CHECK (automation_type IN (
    'status_update',
    'email_sent', 
    'reminder_triggered',
    'email_event_received'
  )),
  trigger_event text, -- What caused this automation
  old_status text,
  new_status text,
  
  -- Email details (if automation_type = 'email_sent')
  email_type text, -- 'initial_invite', 'follow_up_no_open', 'clarity_check', etc.
  email_message_id text, -- Resend message ID
  
  -- Metadata
  details jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) -- NULL if automated
);

-- Indexes for performance
CREATE INDEX idx_automation_log_proposal ON proposal_automation_log(proposal_id);
CREATE INDEX idx_automation_log_type ON proposal_automation_log(automation_type);
CREATE INDEX idx_automation_log_created ON proposal_automation_log(created_at DESC);
CREATE INDEX idx_automation_log_email_message_id ON proposal_automation_log(email_message_id) 
  WHERE email_message_id IS NOT NULL;

-- RLS Policies
ALTER TABLE public.proposal_automation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view automation logs for their proposals"
ON public.proposal_automation_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_automation_log.proposal_id
      AND (p.agent_id = auth.uid() OR is_current_user_admin())
  )
);

CREATE POLICY "System can insert automation logs"
ON public.proposal_automation_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.proposal_automation_log TO authenticated;
GRANT INSERT ON public.proposal_automation_log TO authenticated;

COMMENT ON TABLE public.proposal_automation_log IS 'Audit log of all automated actions on proposals including status changes and email sends';
COMMENT ON COLUMN public.proposal_automation_log.automation_type IS 'Type of automation action performed';
COMMENT ON COLUMN public.proposal_automation_log.email_message_id IS 'Resend message ID for tracking which email triggered events';

-- Add engagement tracking columns to proposals table

ALTER TABLE public.proposals
ADD COLUMN last_engagement_at timestamp with time zone,
ADD COLUMN engagement_count integer DEFAULT 0,
ADD COLUMN automation_paused boolean DEFAULT false,
ADD COLUMN automation_pause_reason text,
ADD COLUMN last_email_event_type text,
ADD COLUMN last_email_sent_at timestamp with time zone;

-- Indexes for performance
CREATE INDEX idx_proposals_last_engagement ON proposals(last_engagement_at);
CREATE INDEX idx_proposals_automation_paused ON proposals(automation_paused) 
  WHERE automation_paused = true;

-- Comments
COMMENT ON COLUMN proposals.last_engagement_at IS 'Last time client interacted with proposal (open, click, view)';
COMMENT ON COLUMN proposals.engagement_count IS 'Total number of engagement events (opens + clicks + views)';
COMMENT ON COLUMN proposals.automation_paused IS 'Whether to pause automated follow-ups (set by agent)';
COMMENT ON COLUMN proposals.automation_pause_reason IS 'Reason why automation was paused';
COMMENT ON COLUMN proposals.last_email_event_type IS 'Most recent email event type received';
COMMENT ON COLUMN proposals.last_email_sent_at IS 'Timestamp of last email sent for this proposal';

-- Expand proposal status to include email engagement stages

DO $$ 
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'proposals_status_check'
  ) THEN
    ALTER TABLE proposals DROP CONSTRAINT proposals_status_check;
  END IF;
  
  -- Add updated constraint with new statuses
  ALTER TABLE proposals ADD CONSTRAINT proposals_status_check 
  CHECK (status IN (
    'draft',
    'pending',
    'sent',
    'delivered',
    'opened', 
    'viewed',
    'bounced',
    'approved',
    'accepted',
    'rejected',
    'declined',
    'signed',
    'review_later',
    'stale',
    'cession_signed',
    'in_onboarding',
    'audit_ready',
    'archived'
  ));
END $$;

COMMENT ON COLUMN proposals.status IS 'Proposal lifecycle status. Flow: draft → sent → delivered → opened → viewed → accepted/declined. Post-signature: cession_signed → in_onboarding → audit_ready';

-- Create helper functions for email engagement tracking

CREATE OR REPLACE FUNCTION public.increment_proposal_engagement(
  proposal_id uuid,
  event_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE proposals
  SET 
    engagement_count = COALESCE(engagement_count, 0) + 1,
    last_engagement_at = now(),
    last_email_event_type = event_type
  WHERE id = proposal_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_proposal_engagement(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_proposal_engagement(uuid, text) TO service_role;

-- Function to check if status transition is valid
CREATE OR REPLACE FUNCTION public.can_transition_proposal_status(
  current_status text,
  new_status text,
  is_automated boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Manual transitions (agent-initiated) - allow most changes
  IF NOT is_automated THEN
    -- Agents can manually override most statuses
    RETURN true;
  END IF;
  
  -- Automated transitions (email-driven only)
  RETURN (
    -- Invitation flow
    (current_status = 'draft' AND new_status = 'sent') OR
    (current_status = 'pending' AND new_status = 'sent') OR
    (current_status = 'sent' AND new_status IN ('delivered', 'bounced')) OR
    (current_status = 'delivered' AND new_status IN ('opened', 'bounced', 'stale')) OR
    (current_status = 'opened' AND new_status IN ('viewed', 'stale')) OR
    (current_status = 'viewed' AND new_status IN ('accepted', 'declined', 'review_later', 'stale')) OR
    
    -- Backward compatibility
    (current_status = 'approved' AND new_status = 'accepted') OR
    (current_status = 'rejected' AND new_status = 'declined') OR
    (current_status = 'signed' AND new_status = 'cession_signed') OR
    
    -- Post-acceptance flow
    (current_status = 'accepted' AND new_status = 'cession_signed') OR
    (current_status = 'cession_signed' AND new_status = 'in_onboarding') OR
    (current_status = 'in_onboarding' AND new_status = 'audit_ready') OR
    
    -- Any status can go to bounced or archived
    (new_status IN ('bounced', 'archived'))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_transition_proposal_status(text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_transition_proposal_status(text, text, boolean) TO service_role;

-- Function to update proposal status with logging
CREATE OR REPLACE FUNCTION public.update_proposal_status_with_log(
  proposal_id uuid,
  new_status text,
  trigger_event text DEFAULT NULL,
  is_automated boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_status text;
  can_transition boolean;
BEGIN
  -- Get current status
  SELECT status INTO current_status
  FROM proposals
  WHERE id = proposal_id;
  
  IF current_status IS NULL THEN
    RAISE EXCEPTION 'Proposal not found: %', proposal_id;
  END IF;
  
  -- Check if transition is valid
  can_transition := public.can_transition_proposal_status(
    current_status, 
    new_status, 
    is_automated
  );
  
  IF NOT can_transition THEN
    RAISE NOTICE 'Invalid status transition: % -> %', current_status, new_status;
    RETURN false;
  END IF;
  
  -- Update status
  UPDATE proposals
  SET status = new_status
  WHERE id = proposal_id;
  
  -- Log the change
  INSERT INTO proposal_automation_log (
    proposal_id,
    automation_type,
    trigger_event,
    old_status,
    new_status,
    created_by
  ) VALUES (
    proposal_id,
    'status_update',
    trigger_event,
    current_status,
    new_status,
    CASE WHEN is_automated THEN NULL ELSE auth.uid() END
  );
  
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_proposal_status_with_log(uuid, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_proposal_status_with_log(uuid, text, text, boolean) TO service_role;

COMMENT ON FUNCTION public.increment_proposal_engagement IS 'Increments engagement counter and updates last engagement timestamp';
COMMENT ON FUNCTION public.can_transition_proposal_status IS 'Validates if a status transition is allowed based on current state and automation rules';
COMMENT ON FUNCTION public.update_proposal_status_with_log IS 'Updates proposal status with validation and automatic logging';

-- Create trigger to automatically log manual status changes

CREATE OR REPLACE FUNCTION public.log_proposal_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Check if this was already logged by update_proposal_status_with_log function
    -- (to avoid duplicate entries)
    IF NOT EXISTS (
      SELECT 1 FROM proposal_automation_log
      WHERE proposal_id = NEW.id
        AND old_status = OLD.status
        AND new_status = NEW.status
        AND created_at > now() - interval '1 second'
    ) THEN
      INSERT INTO proposal_automation_log (
        proposal_id,
        automation_type,
        trigger_event,
        old_status,
        new_status,
        created_by
      ) VALUES (
        NEW.id,
        'status_update',
        'manual_change',
        OLD.status,
        NEW.status,
        auth.uid()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_log_proposal_status_change ON proposals;

-- Create trigger to log status changes
CREATE TRIGGER trigger_log_proposal_status_change
  AFTER UPDATE ON proposals
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_proposal_status_change();

COMMENT ON FUNCTION public.log_proposal_status_change IS 'Trigger function to automatically log manual proposal status changes to audit log';