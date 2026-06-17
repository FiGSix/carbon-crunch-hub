
-- Functional indexes to make duplicate-client lookups fast
CREATE INDEX IF NOT EXISTS clients_email_normalized_idx
  ON public.clients ((lower(btrim(email))));
CREATE INDEX IF NOT EXISTS clients_fullname_normalized_idx
  ON public.clients ((lower(btrim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')))));

-- Trigger function: propagate a newly inserted agreement to sibling proposals
CREATE OR REPLACE FUNCTION public.propagate_master_agreement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_email_norm text;
  v_name_norm text;
  v_matched_clients uuid[];
BEGIN
  -- Skip propagation for rows we cloned ourselves, to avoid recursion
  IF NEW.metadata IS NOT NULL
     AND (NEW.metadata->>'source') = 'master_agreement_propagation' THEN
    RETURN NEW;
  END IF;

  -- Find the client_reference_id from the source proposal
  SELECT p.client_reference_id INTO v_client_id
  FROM public.proposals p
  WHERE p.id = NEW.proposal_id;

  IF v_client_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Normalize email + full name of the signing client
  SELECT lower(btrim(c.email)),
         lower(btrim(coalesce(c.first_name,'') || ' ' || coalesce(c.last_name,'')))
    INTO v_email_norm, v_name_norm
  FROM public.clients c
  WHERE c.id = v_client_id;

  -- Build candidate client set: same id, OR same normalized email,
  -- OR same normalized full name when at least one side has no email.
  SELECT array_agg(DISTINCT c.id)
    INTO v_matched_clients
  FROM public.clients c
  WHERE c.id = v_client_id
     OR (v_email_norm IS NOT NULL AND v_email_norm <> ''
         AND lower(btrim(c.email)) = v_email_norm)
     OR (v_name_norm IS NOT NULL AND btrim(v_name_norm) <> ''
         AND lower(btrim(coalesce(c.first_name,'') || ' ' || coalesce(c.last_name,''))) = v_name_norm
         AND (c.email IS NULL OR v_email_norm IS NULL OR v_email_norm = ''));

  IF v_matched_clients IS NULL OR array_length(v_matched_clients, 1) = 0 THEN
    v_matched_clients := ARRAY[v_client_id];
  END IF;

  -- Stamp master-agreement metadata on every matched client that lacks it
  UPDATE public.clients
     SET cession_signed_at = NEW.signed_at,
         first_agreement_id = NEW.id
   WHERE id = ANY(v_matched_clients)
     AND cession_signed_at IS NULL;

  -- Clone the agreement onto every sibling proposal that is still open
  INSERT INTO public.proposal_agreements (
    proposal_id, signed_by, signed_at, signature_type, signature_type_used,
    typed_name, signed_pdf_url, signature_image_url, accepted_terms_version,
    ip_address, user_agent,
    witness_1_name, witness_1_verified_at, witness_1_ip_address,
    witness_2_name, witness_2_verified_at, witness_2_ip_address,
    witness_method, metadata
  )
  SELECT
    p.id, NEW.signed_by, NEW.signed_at, NEW.signature_type, NEW.signature_type_used,
    NEW.typed_name, NEW.signed_pdf_url, NEW.signature_image_url, NEW.accepted_terms_version,
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
    AND p.status IN ('draft','sent','delivered','opened','viewed','stale')
    AND p.deleted_at IS NULL
    AND p.archived_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.proposal_agreements pa WHERE pa.proposal_id = p.id
    );

  -- Approve those sibling proposals
  UPDATE public.proposals
     SET status = 'approved',
         signed_at = NEW.signed_at
   WHERE client_reference_id = ANY(v_matched_clients)
     AND id <> NEW.proposal_id
     AND status IN ('draft','sent','delivered','opened','viewed','stale')
     AND deleted_at IS NULL
     AND archived_at IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS propagate_master_agreement_trg ON public.proposal_agreements;
CREATE TRIGGER propagate_master_agreement_trg
AFTER INSERT ON public.proposal_agreements
FOR EACH ROW
EXECUTE FUNCTION public.propagate_master_agreement();
