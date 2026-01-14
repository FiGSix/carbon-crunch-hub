-- 1. Update leads that already exist and have expired invitations
UPDATE agent_leads 
SET status = 'contacted',
    converted_at = NULL,
    converted_invitation_id = NULL,
    updated_at = NOW()
FROM agent_invitations ai
WHERE LOWER(agent_leads.email) = LOWER(ai.email)
AND ai.status = 'pending'
AND ai.expires_at < NOW();

-- 2. Insert new leads from orphan expired invitations
INSERT INTO agent_leads (company_name, contact_name, email, status, source, notes, created_at, updated_at)
SELECT 
  COALESCE(ai.company_name, 'Unknown Company'),
  TRIM(COALESCE(ai.first_name, '') || ' ' || COALESCE(ai.last_name, '')),
  ai.email,
  'contacted',
  'invitation_recovery',
  'Recovered from expired invitation (originally invited ' || ai.created_at::date || ')',
  NOW(),
  NOW()
FROM agent_invitations ai
WHERE ai.status = 'pending'
AND ai.expires_at < NOW()
AND NOT EXISTS (
  SELECT 1 FROM agent_leads al WHERE LOWER(al.email) = LOWER(ai.email)
);

-- 3. Mark expired invitations as expired
UPDATE agent_invitations
SET status = 'expired'
WHERE status = 'pending'
AND expires_at < NOW();