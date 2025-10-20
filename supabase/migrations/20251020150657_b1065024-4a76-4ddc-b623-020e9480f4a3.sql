-- Add signature image fields to proposal_agreements table
ALTER TABLE proposal_agreements 
ADD COLUMN IF NOT EXISTS signature_image_url TEXT,
ADD COLUMN IF NOT EXISTS signature_type_used TEXT DEFAULT 'typed_name';

COMMENT ON COLUMN proposal_agreements.signature_image_url IS 
'URL to the drawn signature image stored in storage bucket (if signature_type_used was canvas)';

COMMENT ON COLUMN proposal_agreements.signature_type_used IS 
'Type of signature used: canvas (drawn) or typed_name';

-- Drop existing policy if it exists and recreate
DROP POLICY IF EXISTS "Service role can upload signatures" ON storage.objects;

CREATE POLICY "Service role can upload signatures"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'signed-agreements' AND (storage.foldername(name))[1] = 'signatures');