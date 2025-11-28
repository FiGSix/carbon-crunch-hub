-- Create reusable timestamp update function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create legal_documents table
CREATE TABLE IF NOT EXISTS public.legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL CHECK (document_type IN ('agent_referral_agreement', 'cession_agreement', 'privacy_policy', 'terms_of_service')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  current_version INTEGER NOT NULL DEFAULT 1,
  effective_date DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure only one active document per type
  UNIQUE(document_type, current_version)
);

-- Create index for efficient lookups
CREATE INDEX idx_legal_documents_type ON public.legal_documents(document_type);
CREATE INDEX idx_legal_documents_status ON public.legal_documents(status);
CREATE INDEX idx_legal_documents_active ON public.legal_documents(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

-- Anyone can read published documents
CREATE POLICY "Anyone can view published legal documents"
  ON public.legal_documents
  FOR SELECT
  USING (status = 'published' AND is_active = true);

-- Admins can manage all documents
CREATE POLICY "Admins can manage legal documents"
  ON public.legal_documents
  FOR ALL
  USING (is_current_user_admin());

-- Auto-update updated_at timestamp
CREATE TRIGGER update_legal_documents_updated_at
  BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial Cession Agreement Rev 8
INSERT INTO public.legal_documents (
  document_type,
  title,
  content,
  current_version,
  effective_date,
  status,
  is_active,
  metadata
) VALUES (
  'cession_agreement',
  'Cession Agreement (Revision 8)',
  'Full Cession Agreement Revision 8 content will be loaded from code',
  8,
  CURRENT_DATE,
  'published',
  true,
  '{"revision": 8, "source": "Initial seed"}'::jsonb
) ON CONFLICT DO NOTHING;

-- Create legal_document_acceptances table
CREATE TABLE IF NOT EXISTS public.legal_document_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one acceptance record per user per document version
  UNIQUE(user_id, document_id, version)
);

-- Create index for efficient lookups
CREATE INDEX idx_legal_acceptances_user_id ON public.legal_document_acceptances(user_id);
CREATE INDEX idx_legal_acceptances_document_id ON public.legal_document_acceptances(document_id);
CREATE INDEX idx_legal_acceptances_accepted_at ON public.legal_document_acceptances(accepted_at DESC);

-- Enable RLS
ALTER TABLE public.legal_document_acceptances ENABLE ROW LEVEL SECURITY;

-- Users can view their own acceptances
CREATE POLICY "Users can view own acceptances"
  ON public.legal_document_acceptances
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own acceptances
CREATE POLICY "Users can create own acceptances"
  ON public.legal_document_acceptances
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all acceptances
CREATE POLICY "Admins can view all acceptances"
  ON public.legal_document_acceptances
  FOR SELECT
  USING (is_current_user_admin());

-- No updates or deletes allowed (immutable audit trail)
CREATE POLICY "No updates to acceptances"
  ON public.legal_document_acceptances
  FOR UPDATE
  USING (false);

CREATE POLICY "No deletes of acceptances"
  ON public.legal_document_acceptances
  FOR DELETE
  USING (false);

-- Helper function to check if user has accepted latest version of a document
CREATE OR REPLACE FUNCTION public.has_accepted_latest_version(
  p_user_id UUID,
  p_document_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_latest_version INTEGER;
  v_user_accepted_version INTEGER;
BEGIN
  -- Get latest published version
  SELECT current_version INTO v_latest_version
  FROM legal_documents
  WHERE document_type = p_document_type
    AND is_active = true
    AND status = 'published'
  ORDER BY current_version DESC
  LIMIT 1;
  
  -- If no published document, return true (no requirement)
  IF v_latest_version IS NULL THEN
    RETURN true;
  END IF;
  
  -- Get user's latest accepted version
  SELECT version INTO v_user_accepted_version
  FROM legal_document_acceptances lda
  JOIN legal_documents ld ON ld.id = lda.document_id
  WHERE lda.user_id = p_user_id
    AND ld.document_type = p_document_type
  ORDER BY lda.version DESC
  LIMIT 1;
  
  -- Return true if user accepted the latest version
  RETURN COALESCE(v_user_accepted_version >= v_latest_version, false);
END;
$$;