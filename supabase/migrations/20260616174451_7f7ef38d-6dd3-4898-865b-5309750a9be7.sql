DROP POLICY IF EXISTS "Agents can upload their company logos" ON storage.objects;
DROP POLICY IF EXISTS "Agents can update their company logos" ON storage.objects;
DROP POLICY IF EXISTS "Agents can delete their company logos" ON storage.objects;

CREATE POLICY "Partners can upload their company logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'company-logos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('agent', 'super_partner', 'admin')
  )
);

CREATE POLICY "Partners can update their company logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'company-logos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('agent', 'super_partner', 'admin')
  )
);

CREATE POLICY "Partners can delete their company logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'company-logos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('agent', 'super_partner', 'admin')
  )
);