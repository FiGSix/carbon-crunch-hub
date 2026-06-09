
CREATE OR REPLACE FUNCTION public.delete_proposal(proposal_id uuid, user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  proposal_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 
    FROM proposals 
    WHERE id = proposal_id 
    AND (
      client_id = user_id 
      OR agent_id = user_id
      OR EXISTS(SELECT 1 FROM profiles WHERE id = user_id AND role = 'admin')
    )
  ) INTO proposal_exists;
  
  IF NOT proposal_exists THEN
    RETURN FALSE;
  END IF;
  
  UPDATE proposals
  SET deleted_at = NOW(), deleted_by = user_id
  WHERE id = proposal_id;

  -- Clear cession record on the primary client if this was their first/anchor agreement
  UPDATE clients
  SET first_agreement_id = NULL,
      cession_signed_at = NULL,
      updated_at = NOW()
  WHERE first_agreement_id = proposal_id;

  -- Clear cession record on any additional clients linked via proposal_clients
  UPDATE clients c
  SET first_agreement_id = NULL,
      cession_signed_at = NULL,
      updated_at = NOW()
  FROM proposal_clients pc
  WHERE pc.proposal_id = delete_proposal.proposal_id
    AND c.id = pc.client_id
    AND (c.first_agreement_id = delete_proposal.proposal_id OR c.first_agreement_id IS NULL)
    AND c.cession_signed_at IS NOT NULL;

  RETURN TRUE;
END;
$function$;

-- Backfill: any client pointing at a missing or soft-deleted proposal should be cleared
UPDATE clients c
SET first_agreement_id = NULL,
    cession_signed_at = NULL,
    updated_at = NOW()
WHERE c.first_agreement_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = c.first_agreement_id
      AND p.deleted_at IS NULL
  );
