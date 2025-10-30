-- Create the onboarding-documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'onboarding-documents',
  'onboarding-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'application/x-pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload PDFs to their project folders
CREATE POLICY "Authenticated users can upload onboarding documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'onboarding-documents'
  AND (storage.foldername(name))[1] LIKE 'legacy-%'
);

-- Allow authenticated users to read onboarding documents
CREATE POLICY "Authenticated users can read onboarding documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'onboarding-documents'
);

-- Allow users to delete documents they uploaded
CREATE POLICY "Authenticated users can delete their onboarding documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'onboarding-documents'
  AND auth.uid()::text = (storage.foldername(name))[2]
);