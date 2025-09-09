-- Add PDF storage fields to proposals table
ALTER TABLE public.proposals ADD COLUMN pdf_url TEXT;
ALTER TABLE public.proposals ADD COLUMN pdf_generated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.proposals ADD COLUMN pdf_version INTEGER DEFAULT 1;

-- Create index for efficient PDF queries
CREATE INDEX idx_proposals_pdf_metadata ON public.proposals(pdf_generated_at, pdf_version) WHERE pdf_url IS NOT NULL;