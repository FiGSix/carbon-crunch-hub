DROP POLICY IF EXISTS "Agents can view published resources" ON public.knowledge_hub_resources;
CREATE POLICY "Agents can view published resources"
ON public.knowledge_hub_resources
FOR SELECT
TO authenticated
USING (
  is_published = true
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = ANY (ARRAY['admin'::app_role, 'agent'::app_role, 'super_partner'::app_role])
  )
);

DROP POLICY IF EXISTS "Authenticated users can read knowledge-hub files" ON storage.objects;
CREATE POLICY "Authenticated users can read knowledge-hub files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'knowledge-hub'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = ANY (ARRAY['admin'::app_role, 'agent'::app_role, 'super_partner'::app_role])
  )
);