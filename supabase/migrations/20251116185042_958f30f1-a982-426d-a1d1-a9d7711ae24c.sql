-- Phase B: Backfill existing proposals with proper client links
-- Phase D: Add trigger for future-proofing

-- ==========================================
-- PHASE B: BACKFILL EXISTING PROPOSALS
-- ==========================================

-- Step 1: Link proposals to client profiles where client_reference_id exists
UPDATE proposals p
SET client_id = pr.id
FROM clients c
JOIN profiles pr ON lower(trim(pr.email)) = lower(trim(c.email)) AND pr.role = 'client'
WHERE p.client_id IS NULL
  AND p.client_reference_id = c.id
  AND p.deleted_at IS NULL;

-- Step 2: Create missing client records from email_events
INSERT INTO clients (email, first_name, last_name, notes, created_at)
SELECT DISTINCT 
  lower(trim(e.recipient_email)) as email,
  split_part(p.title, ' - ', 2) as first_name,
  '' as last_name,
  'Auto-created from proposal email during backfill' as notes,
  now() as created_at
FROM email_events e
JOIN proposals p ON p.id = e.proposal_id
WHERE p.client_reference_id IS NULL
  AND p.deleted_at IS NULL
  AND lower(trim(e.recipient_email)) NOT IN (SELECT lower(trim(email)) FROM clients)
ON CONFLICT (email) DO NOTHING;

-- Step 3: Link proposals to these newly created clients
UPDATE proposals p
SET client_reference_id = c.id
FROM email_events e
JOIN clients c ON lower(trim(c.email)) = lower(trim(e.recipient_email))
WHERE p.id = e.proposal_id
  AND p.client_reference_id IS NULL
  AND p.deleted_at IS NULL;

-- Step 4: Set client_id where profiles exist (from email_events)
UPDATE proposals p
SET client_id = pr.id
FROM email_events e
JOIN profiles pr ON lower(trim(pr.email)) = lower(trim(e.recipient_email)) AND pr.role = 'client'
WHERE p.id = e.proposal_id
  AND p.client_id IS NULL
  AND p.deleted_at IS NULL;

-- ==========================================
-- PHASE D: FUTURE-PROOF WITH TRIGGER
-- ==========================================

-- Create trigger function to auto-link clients to profiles on signup
CREATE OR REPLACE FUNCTION public.link_client_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update any clients with matching email
  UPDATE clients
  SET user_id = NEW.id, 
      updated_at = now()
  WHERE user_id IS NULL
    AND lower(trim(email)) = lower(trim(NEW.email));
  
  -- Also update proposals.client_id for this user
  UPDATE proposals p
  SET client_id = NEW.id
  FROM clients c
  WHERE p.client_reference_id = c.id
    AND c.user_id = NEW.id
    AND p.client_id IS NULL
    AND p.deleted_at IS NULL;
  
  RETURN NEW;
END;
$$;

-- Attach trigger to profiles table
DROP TRIGGER IF EXISTS trg_link_client_to_profile ON public.profiles;
CREATE TRIGGER trg_link_client_to_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role = 'client')
  EXECUTE FUNCTION public.link_client_to_profile();