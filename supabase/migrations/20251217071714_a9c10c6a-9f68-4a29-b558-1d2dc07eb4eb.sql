-- Fix legacy documents upload policy using is_current_user_admin()
-- which is a SECURITY DEFINER function with explicit search_path
DROP POLICY IF EXISTS "Admins can upload legacy documents" ON storage.objects;

CREATE POLICY "Admins can upload legacy documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'onboarding-documents'
  AND (string_to_array(name, '/'))[1] LIKE 'legacy-%'
  AND public.is_current_user_admin()
);