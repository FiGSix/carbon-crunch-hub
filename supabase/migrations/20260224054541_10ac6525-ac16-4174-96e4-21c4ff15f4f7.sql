
-- Knowledge Hub resources table
CREATE TABLE public.knowledge_hub_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'other',
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size_bytes bigint,
  mime_type text,
  tags text[] DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT false,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  download_count integer NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.knowledge_hub_resources ENABLE ROW LEVEL SECURITY;

-- Admin full CRUD via user_roles
CREATE POLICY "Admins can manage knowledge hub resources"
ON public.knowledge_hub_resources
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
));

-- Agents can SELECT published resources only
CREATE POLICY "Agents can view published resources"
ON public.knowledge_hub_resources
FOR SELECT
TO authenticated
USING (
  is_published = true
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'agent')
  )
);

-- Updated_at trigger
CREATE TRIGGER update_knowledge_hub_resources_updated_at
BEFORE UPDATE ON public.knowledge_hub_resources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-hub', 'knowledge-hub', false);

-- Storage policies: admins can upload
CREATE POLICY "Admins can upload to knowledge-hub"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'knowledge-hub'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  )
);

-- Storage policies: admins can delete
CREATE POLICY "Admins can delete from knowledge-hub"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'knowledge-hub'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  )
);

-- Storage policies: admins and agents can read (for signed URLs)
CREATE POLICY "Authenticated users can read knowledge-hub files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'knowledge-hub'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'agent')
  )
);
