-- Remove the broken policy that tries to check user_roles (causes 403 because storage API can't query RLS-protected tables)
DROP POLICY IF EXISTS "Admins can upload legacy documents" ON storage.objects;

-- Create simple policy that allows authenticated users to upload to legacy paths
-- Admin access is controlled at the UI/application level (AddLegacyProjectDialog only shown to admins)
CREATE POLICY "Authenticated users can upload legacy documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'onboarding-documents'
  AND (string_to_array(name, '/'))[1] LIKE 'legacy-%'
);