-- 1. legal_documents: file + live flag
ALTER TABLE public.legal_documents
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS file_mime text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS source_file_path text,
  ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS set_live_at timestamptz,
  ADD COLUMN IF NOT EXISTS set_live_by uuid;

CREATE UNIQUE INDEX IF NOT EXISTS legal_documents_one_live_per_type
  ON public.legal_documents (document_type) WHERE is_live;

-- 2. master signature per client
CREATE TABLE IF NOT EXISTS public.client_cession_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  legal_document_id uuid REFERENCES public.legal_documents(id),
  legal_document_version integer,
  legal_document_title text,
  legal_document_file_path text,
  signed_by uuid,
  origin_proposal_id uuid,
  signature_type text NOT NULL DEFAULT 'typed_name',
  typed_name text,
  signature_image_url text,
  ip_address inet,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  signed_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS client_cession_signatures_active_client
  ON public.client_cession_signatures (client_id) WHERE revoked_at IS NULL;

GRANT SELECT ON public.client_cession_signatures TO authenticated;
GRANT ALL ON public.client_cession_signatures TO service_role;

ALTER TABLE public.client_cession_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all cession signatures"
  ON public.client_cession_signatures FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients read their own cession signature"
  ON public.client_cession_signatures FOR SELECT TO authenticated
  USING (client_id IN (SELECT unnest(public.get_user_client_ids())));

CREATE POLICY "Agents read signatures of their clients"
  ON public.client_cession_signatures FOR SELECT TO authenticated
  USING (public.agent_has_proposals_with_client(client_id));

DROP TRIGGER IF EXISTS update_client_cession_signatures_updated_at ON public.client_cession_signatures;
CREATE TRIGGER update_client_cession_signatures_updated_at
  BEFORE UPDATE ON public.client_cession_signatures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. proposal_agreements: per-proposal generated document record
ALTER TABLE public.proposal_agreements
  ADD COLUMN IF NOT EXISTS client_cession_signature_id uuid REFERENCES public.client_cession_signatures(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS legal_document_id uuid REFERENCES public.legal_documents(id),
  ADD COLUMN IF NOT EXISTS legal_document_version integer,
  ADD COLUMN IF NOT EXISTS pdf_path text,
  ADD COLUMN IF NOT EXISTS generated_at timestamptz;

-- 4. Backfill signed_pdf_url public URLs -> storage paths, and populate pdf_path
UPDATE public.proposal_agreements
SET signed_pdf_url = regexp_replace(signed_pdf_url, '^.*/object/(?:public|sign)/signed-agreements/', '')
WHERE signed_pdf_url LIKE '%/object/%/signed-agreements/%';

UPDATE public.proposal_agreements
SET signed_pdf_url = split_part(signed_pdf_url, '?', 1)
WHERE signed_pdf_url LIKE '%?%';

UPDATE public.proposal_agreements
SET pdf_path = signed_pdf_url
WHERE pdf_path IS NULL AND signed_pdf_url IS NOT NULL;

-- 5. Anonymous-safe read of the live legal document
CREATE OR REPLACE FUNCTION public.get_live_legal_document(p_document_type text)
RETURNS TABLE (
  id uuid,
  document_type text,
  title text,
  content text,
  current_version integer,
  effective_date date,
  file_path text,
  file_mime text,
  set_live_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ld.id, ld.document_type, ld.title, ld.content, ld.current_version,
         ld.effective_date, ld.file_path, ld.file_mime, ld.set_live_at
  FROM public.legal_documents ld
  WHERE ld.document_type = p_document_type
    AND ld.is_live
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_live_legal_document(text) TO anon, authenticated, service_role;

-- 6. Set a document live (admin only), clearing any other live doc of that type
CREATE OR REPLACE FUNCTION public.set_legal_document_live(p_document_id uuid)
RETURNS public.legal_documents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc public.legal_documents;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can set a legal document live';
  END IF;

  SELECT * INTO v_doc FROM public.legal_documents WHERE id = p_document_id;
  IF v_doc.id IS NULL THEN
    RAISE EXCEPTION 'Legal document not found';
  END IF;
  IF v_doc.file_path IS NULL THEN
    RAISE EXCEPTION 'Upload the agreement file before setting this revision live';
  END IF;

  UPDATE public.legal_documents
     SET is_live = false, set_live_at = NULL, set_live_by = NULL
   WHERE document_type = v_doc.document_type AND is_live AND id <> p_document_id;

  UPDATE public.legal_documents
     SET is_live = true,
         is_active = true,
         status = 'published',
         set_live_at = now(),
         set_live_by = auth.uid()
   WHERE id = p_document_id
  RETURNING * INTO v_doc;

  RETURN v_doc;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_legal_document_live(uuid) TO authenticated, service_role;

-- 7. Clients who have never signed (set-live impact count / re-notify).
--    Drafts excluded: only client-visible statuses count.
CREATE OR REPLACE FUNCTION public.get_unsigned_cession_clients()
RETURNS TABLE (
  client_id uuid,
  client_email text,
  client_name text,
  proposal_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id,
         c.email,
         btrim(coalesce(c.first_name,'') || ' ' || coalesce(c.last_name,'')),
         count(p.id)
  FROM public.clients c
  JOIN public.proposals p ON p.client_reference_id = c.id
   AND p.deleted_at IS NULL AND p.archived_at IS NULL
   AND p.status IN ('sent','delivered','opened','viewed','stale')
  WHERE NOT EXISTS (
    SELECT 1 FROM public.client_cession_signatures s
    WHERE s.client_id = c.id AND s.revoked_at IS NULL
  )
  GROUP BY c.id, c.email, c.first_name, c.last_name
$$;

GRANT EXECUTE ON FUNCTION public.get_unsigned_cession_clients() TO authenticated, service_role;

-- 8. Propagation: sibling proposals inherit the signature but NEVER share the PDF.
--    Drafts are skipped entirely - they have not been sent to the client.
--    Duplicate client rows are matched on normalised email only.
CREATE OR REPLACE FUNCTION public.propagate_master_agreement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_email_norm text;
  v_matched_clients uuid[];
BEGIN
  -- Recursion guard: rows this trigger itself created are tagged and skipped.
  IF NEW.metadata IS NOT NULL
     AND (NEW.metadata->>'source') = 'master_agreement_propagation' THEN
    RETURN NEW;
  END IF;

  SELECT p.client_reference_id INTO v_client_id
  FROM public.proposals p
  WHERE p.id = NEW.proposal_id;

  IF v_client_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT lower(btrim(c.email)) INTO v_email_norm
  FROM public.clients c
  WHERE c.id = v_client_id;

  SELECT array_agg(DISTINCT c.id)
    INTO v_matched_clients
  FROM public.clients c
  WHERE c.id = v_client_id
     OR (v_email_norm IS NOT NULL AND v_email_norm <> ''
         AND lower(btrim(c.email)) = v_email_norm);

  IF v_matched_clients IS NULL OR array_length(v_matched_clients, 1) = 0 THEN
    v_matched_clients := ARRAY[v_client_id];
  END IF;

  UPDATE public.clients
     SET cession_signed_at = NEW.signed_at,
         first_agreement_id = NEW.id
   WHERE id = ANY(v_matched_clients)
     AND cession_signed_at IS NULL;

  INSERT INTO public.proposal_agreements (
    proposal_id, signed_by, signed_at, signature_type, signature_type_used,
    typed_name, signature_image_url, accepted_terms_version,
    client_cession_signature_id, legal_document_id, legal_document_version,
    ip_address, user_agent,
    witness_1_name, witness_1_verified_at, witness_1_ip_address,
    witness_2_name, witness_2_verified_at, witness_2_ip_address,
    witness_method, metadata
  )
  SELECT
    p.id, NEW.signed_by, NEW.signed_at, NEW.signature_type, NEW.signature_type_used,
    NEW.typed_name, NEW.signature_image_url, NEW.accepted_terms_version,
    NEW.client_cession_signature_id, NEW.legal_document_id, NEW.legal_document_version,
    NEW.ip_address, NEW.user_agent,
    NEW.witness_1_name, NEW.witness_1_verified_at, NEW.witness_1_ip_address,
    NEW.witness_2_name, NEW.witness_2_verified_at, NEW.witness_2_ip_address,
    NEW.witness_method,
    jsonb_build_object(
      'source', 'master_agreement_propagation',
      'origin_agreement_id', NEW.id,
      'origin_proposal_id', NEW.proposal_id
    )
  FROM public.proposals p
  WHERE p.client_reference_id = ANY(v_matched_clients)
    AND p.id <> NEW.proposal_id
    AND p.status IN ('sent','delivered','opened','viewed','stale')
    AND p.deleted_at IS NULL
    AND p.archived_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.proposal_agreements pa WHERE pa.proposal_id = p.id
    );

  UPDATE public.proposals
     SET status = 'approved',
         signed_at = NEW.signed_at
   WHERE client_reference_id = ANY(v_matched_clients)
     AND id <> NEW.proposal_id
     AND status IN ('sent','delivered','opened','viewed','stale')
     AND deleted_at IS NULL
     AND archived_at IS NULL;

  RETURN NEW;
END;
$$;

-- 8b. Trigger wiring: only genuine master-signature events carry a
--     client_cession_signature_id. Legacy/admin inserts (AttachSignedAgreement,
--     backfills, etc.) do not set it and are ignored. Recursion on sibling rows
--     is still blocked by the metadata guard inside the function.
DROP TRIGGER IF EXISTS propagate_master_agreement_trg ON public.proposal_agreements;
CREATE TRIGGER propagate_master_agreement_trg
  AFTER INSERT ON public.proposal_agreements
  FOR EACH ROW
  WHEN (NEW.client_cession_signature_id IS NOT NULL)
  EXECUTE FUNCTION public.propagate_master_agreement();