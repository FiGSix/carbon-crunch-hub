-- Create lead_outreach_history table to track all outreach emails
CREATE TABLE public.lead_outreach_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.agent_leads(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL CHECK (template_type IN ('introduction', 'follow_up_1', 'follow_up_2')),
  subject TEXT NOT NULL,
  body_preview TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_by UUID REFERENCES auth.users(id),
  resend_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add tracking columns to agent_leads
ALTER TABLE public.agent_leads 
ADD COLUMN IF NOT EXISTS last_outreach_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS outreach_count INTEGER NOT NULL DEFAULT 0;

-- Enable RLS on lead_outreach_history
ALTER TABLE public.lead_outreach_history ENABLE ROW LEVEL SECURITY;

-- Create policies for lead_outreach_history (admins only)
CREATE POLICY "Admins can view all outreach history"
ON public.lead_outreach_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can insert outreach history"
ON public.lead_outreach_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can update outreach history"
ON public.lead_outreach_history
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Create index for faster lookups
CREATE INDEX idx_lead_outreach_history_lead_id ON public.lead_outreach_history(lead_id);
CREATE INDEX idx_lead_outreach_history_status ON public.lead_outreach_history(status);
CREATE INDEX idx_agent_leads_last_outreach ON public.agent_leads(last_outreach_at);