-- Add policy for admin legacy uploads (bypasses project_onboarding.id requirement)
-- This allows admins to upload signed agreements for legacy projects before the project record exists
CREATE POLICY "Admins can upload legacy documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'onboarding-documents'
  AND (string_to_array(name, '/'))[1] LIKE 'legacy-%'
  AND is_current_user_admin()
);