CREATE POLICY "Public read broadcast assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'broadcast-assets');

CREATE POLICY "Admins upload broadcast assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'broadcast-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update broadcast assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'broadcast-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete broadcast assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'broadcast-assets' AND public.has_role(auth.uid(), 'admin'));