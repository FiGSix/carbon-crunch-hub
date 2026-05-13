CREATE TABLE public.email_cta_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL,
  email_send_id TEXT,
  message_id TEXT,
  email_type TEXT NOT NULL DEFAULT 'weekly_roundup',
  cta_type TEXT,
  target_url TEXT,
  variant TEXT,
  subject TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  user_agent TEXT,
  ip_address INET,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_cta_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email cta events"
ON public.email_cta_events
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert email cta events"
ON public.email_cta_events
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update email cta events"
ON public.email_cta_events
FOR UPDATE
TO service_role
USING (true);

CREATE INDEX idx_email_cta_events_agent ON public.email_cta_events(agent_id, sent_at DESC);
CREATE INDEX idx_email_cta_events_message ON public.email_cta_events(message_id);
CREATE INDEX idx_email_cta_events_variant ON public.email_cta_events(variant, email_type);