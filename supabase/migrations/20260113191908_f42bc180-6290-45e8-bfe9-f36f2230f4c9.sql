-- Create agent_leads table for tracking potential agent leads
CREATE TABLE public.agent_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  location TEXT,
  source TEXT DEFAULT 'ChatGPT Research',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'rejected')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  converted_at TIMESTAMP WITH TIME ZONE,
  converted_invitation_id UUID REFERENCES public.agent_invitations(id)
);

-- Enable Row Level Security
ALTER TABLE public.agent_leads ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can view all leads"
ON public.agent_leads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can insert leads"
ON public.agent_leads
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can update leads"
ON public.agent_leads
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete leads"
ON public.agent_leads
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create index for common queries
CREATE INDEX idx_agent_leads_status ON public.agent_leads(status);
CREATE INDEX idx_agent_leads_created_at ON public.agent_leads(created_at DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_agent_leads_updated_at
BEFORE UPDATE ON public.agent_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();