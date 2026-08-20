ALTER TABLE public.broadcast_campaigns
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.validate_broadcast_attachments()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  total_bytes bigint := 0;
  item jsonb;
BEGIN
  IF NEW.attachments IS NULL THEN
    NEW.attachments := '[]'::jsonb;
  END IF;

  IF jsonb_typeof(NEW.attachments) <> 'array' THEN
    RAISE EXCEPTION 'attachments must be a JSON array';
  END IF;

  IF jsonb_array_length(NEW.attachments) > 3 THEN
    RAISE EXCEPTION 'A broadcast may carry at most 3 real attachments';
  END IF;

  FOR item IN SELECT jsonb_array_elements(NEW.attachments) LOOP
    IF item->>'path' IS NULL OR item->>'name' IS NULL THEN
      RAISE EXCEPTION 'Each attachment needs a storage path and a filename';
    END IF;
    total_bytes := total_bytes + COALESCE((item->>'size')::bigint, 0);
  END LOOP;

  IF total_bytes > 5242880 THEN
    RAISE EXCEPTION 'Attachments exceed the 5 MB total limit (% bytes)', total_bytes;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_broadcast_attachments_trg ON public.broadcast_campaigns;
CREATE TRIGGER validate_broadcast_attachments_trg
  BEFORE INSERT OR UPDATE ON public.broadcast_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.validate_broadcast_attachments();

DROP POLICY IF EXISTS "Admins manage broadcast documents" ON storage.objects;
CREATE POLICY "Admins manage broadcast documents"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'broadcast-documents' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'broadcast-documents' AND public.has_role(auth.uid(), 'admin'));