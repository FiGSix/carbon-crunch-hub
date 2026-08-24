-- Admin-only guard inside the function body.
CREATE OR REPLACE FUNCTION public.get_unsigned_cession_clients()
RETURNS TABLE (
  client_id uuid,
  client_email text,
  client_name text,
  proposal_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can list unsigned cession clients';
  END IF;

  RETURN QUERY
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
  GROUP BY c.id, c.email, c.first_name, c.last_name;
END;
$$;

-- Lock down execute: no anonymous access to either admin function.
REVOKE ALL ON FUNCTION public.get_unsigned_cession_clients() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_unsigned_cession_clients() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.set_legal_document_live(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_legal_document_live(uuid) TO authenticated, service_role;

-- get_live_legal_document stays anon-callable by design: the public signing
-- page reads it, it takes no user-controlled filter beyond document_type,
-- and it returns only the single live row.