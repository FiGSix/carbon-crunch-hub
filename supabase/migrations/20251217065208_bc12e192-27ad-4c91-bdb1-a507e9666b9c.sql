-- Update the legacy documents upload policy to include fallback admin check
DROP POLICY IF EXISTS "Admins can upload legacy documents" ON storage.objects;

CREATE POLICY "Admins can upload legacy documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'onboarding-documents'
  AND (string_to_array(name, '/'))[1] LIKE 'legacy-%'
  AND (
    -- Primary check using has_role function
    public.has_role(auth.uid(), 'admin')
    -- Fallback: direct check on user_roles table
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
    -- Secondary fallback: check profiles.role directly
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  )
);