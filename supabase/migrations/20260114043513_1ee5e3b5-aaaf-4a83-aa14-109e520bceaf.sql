-- Remove leads that are already registered agents/admins
DELETE FROM agent_leads
WHERE id IN (
  SELECT al.id
  FROM agent_leads al
  INNER JOIN profiles p ON LOWER(al.email) = LOWER(p.email)
  WHERE p.role IN ('agent', 'admin')
);