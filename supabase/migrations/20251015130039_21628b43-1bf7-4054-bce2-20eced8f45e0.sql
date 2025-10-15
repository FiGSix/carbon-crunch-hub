-- Add Storage RLS policies for onboarding-documents bucket

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Upload onboarding docs to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'onboarding-documents'
  AND name LIKE auth.uid()::text || '/%'
);

-- Allow authenticated users to delete files from their own folder
CREATE POLICY "Delete own onboarding docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'onboarding-documents'
  AND name LIKE auth.uid()::text || '/%'
);