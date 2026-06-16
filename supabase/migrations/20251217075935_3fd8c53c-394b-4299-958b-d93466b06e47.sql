-- Fix: Use FULLY QUALIFIED schema references for storage RLS context
-- The storage schema's search_path doesn't include 'public', so we must be explicit

DROP POLICY IF EXISTS "Admins can upload legacy documents" ON storage.objects;

CREATE POLICY "Admins can upload legacy documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'onboarding-documents'
  AND (string_to_array(name, '/'))[1] LIKE 'legacy-%'
  AND EXISTS (
    SELECT 1 
    FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::public.app_role
  )
);