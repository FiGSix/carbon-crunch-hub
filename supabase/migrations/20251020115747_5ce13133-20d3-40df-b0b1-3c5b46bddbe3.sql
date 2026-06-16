-- Add signed_pdf_url column to proposal_agreements
ALTER TABLE proposal_agreements 
ADD COLUMN IF NOT EXISTS signed_pdf_url TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_proposal_agreements_signed_pdf 
ON proposal_agreements(proposal_id) 
WHERE signed_pdf_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN proposal_agreements.signed_pdf_url IS 
'URL to the signed PDF agreement with all signature metadata and initials';

-- Create storage bucket for signed agreements
INSERT INTO storage.buckets (id, name, public)
VALUES ('signed-agreements', 'signed-agreements', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for signed-agreements bucket
CREATE POLICY "Authenticated users can view signed agreements"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'signed-agreements');

CREATE POLICY "Service role can upload signed agreements"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'signed-agreements');

CREATE POLICY "Service role can update signed agreements"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'signed-agreements');