-- Soft-archive ghost proposals auto-created by the (now deprecated) Sales Agent draft-proposal flow.
-- These records have no project data (the installer/agent hasn't completed onboarding yet)
-- and clutter dashboards. Keeping the rows for auditability via archived_at instead of deleting.
UPDATE public.proposals
SET archived_at = now()
WHERE source = 'sales_agent'
  AND archived_at IS NULL
  AND status = 'draft'
  AND COALESCE(system_size_kwp, 0) = 0
  AND (content->'projectInfo') IS NULL;