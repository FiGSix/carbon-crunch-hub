-- One-time data fix: Sync system_name from onboarding_fields to proposals table
-- This ensures existing projects have consistent naming across tables

UPDATE proposals p
SET 
  title = of.system_name,
  project_info = jsonb_set(
    COALESCE(p.project_info, '{}'::jsonb), 
    '{name}', 
    to_jsonb(of.system_name)
  ),
  updated_at = now()
FROM project_onboarding po
JOIN onboarding_fields of ON of.project_id = po.id
WHERE p.id = po.proposal_id
  AND of.system_name IS NOT NULL
  AND of.system_name != ''
  AND (
    p.title IS DISTINCT FROM of.system_name 
    OR (p.project_info->>'name') IS DISTINCT FROM of.system_name
  );