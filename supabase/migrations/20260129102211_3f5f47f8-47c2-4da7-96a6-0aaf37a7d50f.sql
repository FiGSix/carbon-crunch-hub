-- Backfill installer fields for existing onboarding projects
-- Only updates records where installer_company_name is NULL or empty

UPDATE onboarding_fields of
SET 
  installer_company_name = CASE
    -- No agent OR Crunch Carbon agent
    WHEN p.agent_id IS NULL 
      OR COALESCE(c.company_name, prof.company_name, '') ILIKE '%crunch carbon%'
    THEN 'To be confirmed'
    -- External agent: use team company (priority) or profile company
    ELSE COALESCE(c.company_name, prof.company_name, 'To be confirmed')
  END,
  installer_email = CASE
    -- No agent OR Crunch Carbon agent
    WHEN p.agent_id IS NULL 
      OR COALESCE(c.company_name, prof.company_name, '') ILIKE '%crunch carbon%'
    THEN 'To be confirmed'
    -- External agent: use agent's email
    ELSE COALESCE(prof.email, 'To be confirmed')
  END,
  updated_at = NOW()
FROM project_onboarding po
JOIN proposals p ON p.id = po.proposal_id
LEFT JOIN profiles prof ON prof.id = p.agent_id
LEFT JOIN company_members cm ON cm.user_id = p.agent_id AND cm.status = 'active'
LEFT JOIN companies c ON c.id = cm.company_id
WHERE po.id = of.project_id
  AND (of.installer_company_name IS NULL OR of.installer_company_name = '');