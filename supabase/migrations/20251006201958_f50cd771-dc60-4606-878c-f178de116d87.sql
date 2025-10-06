-- Create enum for signature types
CREATE TYPE signature_type AS ENUM ('typed_name', 'electronic_signature', 'manual');

-- Create proposal_agreements table for digital signature tracking
CREATE TABLE public.proposal_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  signed_by UUID NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  signature_type signature_type NOT NULL DEFAULT 'typed_name',
  typed_name TEXT,
  ip_address INET,
  user_agent TEXT,
  accepted_terms_version TEXT NOT NULL DEFAULT '1.0',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_proposal_agreements_proposal_id ON public.proposal_agreements(proposal_id);
CREATE INDEX idx_proposal_agreements_signed_by ON public.proposal_agreements(signed_by);
CREATE INDEX idx_proposal_agreements_signed_at ON public.proposal_agreements(signed_at DESC);

-- Enable RLS
ALTER TABLE public.proposal_agreements ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own agreements
CREATE POLICY "Users can view own agreements"
ON public.proposal_agreements
FOR SELECT
USING (
  signed_by = auth.uid() OR 
  is_current_user_admin() OR
  EXISTS (
    SELECT 1 FROM public.proposals 
    WHERE proposals.id = proposal_agreements.proposal_id 
    AND proposals.agent_id = auth.uid()
  )
);

-- RLS Policy: Authenticated users can insert agreements
CREATE POLICY "Users can create agreements"
ON public.proposal_agreements
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  (signed_by = auth.uid() OR is_current_user_admin())
);

-- RLS Policy: No updates allowed (preserve audit trail)
CREATE POLICY "No updates to agreements"
ON public.proposal_agreements
FOR UPDATE
USING (false);

-- RLS Policy: No deletes allowed (preserve audit trail)
CREATE POLICY "No deletes of agreements"
ON public.proposal_agreements
FOR DELETE
USING (false);

-- Add helpful comments
COMMENT ON TABLE public.proposal_agreements IS 'Tracks digital signatures and agreement acceptance for legal audit trail';
COMMENT ON COLUMN public.proposal_agreements.signed_by IS 'User ID of person who signed (may be client or agent)';
COMMENT ON COLUMN public.proposal_agreements.typed_name IS 'Full name as typed by signer for verification';
COMMENT ON COLUMN public.proposal_agreements.ip_address IS 'IP address at time of signing for audit trail';
COMMENT ON COLUMN public.proposal_agreements.user_agent IS 'Browser/device information for audit trail';
COMMENT ON COLUMN public.proposal_agreements.accepted_terms_version IS 'Version of terms and conditions accepted';
COMMENT ON COLUMN public.proposal_agreements.metadata IS 'Additional audit data (location, session info, etc.)';