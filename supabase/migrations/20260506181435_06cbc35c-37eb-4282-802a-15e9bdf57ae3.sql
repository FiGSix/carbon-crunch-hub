-- Make proposal-pdfs and signed-agreements buckets private.
-- After this migration, files are accessible only via short-lived signed URLs
-- minted by the get-pdf-signed-url edge function (or any service-role caller).

UPDATE storage.buckets SET public = false WHERE id = 'proposal-pdfs';
UPDATE storage.buckets SET public = false WHERE id = 'signed-agreements';

-- Drop any permissive SELECT policies that allowed anonymous access to entire buckets.
-- Service-role calls (edge functions) bypass RLS regardless, so signed URLs keep working.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND cmd = 'SELECT'
      AND (
        qual ILIKE '%proposal-pdfs%'
        OR qual ILIKE '%signed-agreements%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;