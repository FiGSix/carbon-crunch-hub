-- Remove the broken policy that uses TO authenticated (doesn't work reliably with Storage API)
DROP POLICY IF EXISTS "Authenticated users can upload legacy documents" ON storage.objects;

-- Create policy using the PROVEN WORKING pattern:
-- 1. No TO clause (applies to all roles by default)
-- 2. auth.role() = 'authenticated' check INSIDE the WITH CHECK clause
CREATE POLICY "Authenticated users can upload legacy documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'onboarding-documents'
  AND (string_to_array(name, '/'))[1] LIKE 'legacy-%'
  AND auth.role() = 'authenticated'
);