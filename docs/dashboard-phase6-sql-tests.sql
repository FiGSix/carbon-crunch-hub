-- ============================================================
-- Phase 6: SQL Testing Script for Dashboard Metrics
-- ============================================================
-- Purpose: Verify the get_dashboard_metrics_by_stage function
--          works correctly for all user roles
-- ============================================================

-- ============================================================
-- STEP 1: Check Current Data Distribution
-- ============================================================

-- Count proposals by stage (system-wide)
SELECT 
  'System-Wide Counts' as category,
  COUNT(*) as total_proposals,
  COUNT(*) FILTER (WHERE p.signed_at IS NOT NULL AND po.audit_ready = true) as audit_ready,
  COUNT(*) FILTER (WHERE p.signed_at IS NOT NULL AND (po.audit_ready = false OR po.audit_ready IS NULL)) as onboarding,
  COUNT(*) FILTER (WHERE p.signed_at IS NULL AND p.status IN ('pending', 'draft')) as pending
FROM proposals p
LEFT JOIN project_onboarding po ON po.proposal_id = p.id
WHERE p.deleted_at IS NULL AND p.archived_at IS NULL;

-- ============================================================
-- STEP 2: Test Admin Role (Should See Everything)
-- ============================================================

-- Replace 'ADMIN_USER_ID_HERE' with actual admin user ID
-- Get admin user ID first:
SELECT id, email, role FROM profiles WHERE role = 'admin' LIMIT 1;

-- Test admin access (replace the UUID with actual admin ID)
SELECT * FROM get_dashboard_metrics_by_stage(
  'ADMIN_USER_ID_HERE'::uuid,  -- Replace with admin user ID
  'admin'
);

-- Expected: Should return all system-wide counts

-- ============================================================
-- STEP 3: Test Agent Role (Should See Only Their Projects)
-- ============================================================

-- Get agent user IDs first:
SELECT id, email, first_name, last_name 
FROM profiles 
WHERE role = 'agent' 
ORDER BY email 
LIMIT 5;

-- Count proposals for a specific agent (replace AGENT_ID)
SELECT 
  'Agent-Specific Counts' as category,
  COUNT(*) as total_proposals,
  COUNT(*) FILTER (WHERE p.signed_at IS NOT NULL AND po.audit_ready = true) as audit_ready,
  COUNT(*) FILTER (WHERE p.signed_at IS NOT NULL AND (po.audit_ready = false OR po.audit_ready IS NULL)) as onboarding,
  COUNT(*) FILTER (WHERE p.signed_at IS NULL AND p.status IN ('pending', 'draft')) as pending
FROM proposals p
LEFT JOIN project_onboarding po ON po.proposal_id = p.id
WHERE p.deleted_at IS NULL 
  AND p.archived_at IS NULL
  AND p.agent_id = 'AGENT_USER_ID_HERE'::uuid;  -- Replace with agent ID

-- Test agent access (replace the UUID with actual agent ID)
SELECT * FROM get_dashboard_metrics_by_stage(
  'AGENT_USER_ID_HERE'::uuid,  -- Replace with agent user ID
  'agent'
);

-- Expected: Should only return counts for this agent's proposals

-- ============================================================
-- STEP 4: Test Client Role (Should See Only Their Projects)
-- ============================================================

-- Get client user IDs first:
SELECT p.id, p.email, c.first_name, c.last_name, c.user_id
FROM profiles p
LEFT JOIN clients c ON c.user_id = p.id
WHERE p.role = 'client' 
LIMIT 5;

-- Count proposals for a specific client
SELECT 
  'Client-Specific Counts' as category,
  COUNT(*) as total_proposals,
  COUNT(*) FILTER (WHERE p.signed_at IS NOT NULL AND po.audit_ready = true) as audit_ready,
  COUNT(*) FILTER (WHERE p.signed_at IS NOT NULL AND (po.audit_ready = false OR po.audit_ready IS NULL)) as onboarding,
  COUNT(*) FILTER (WHERE p.signed_at IS NULL AND p.status IN ('pending', 'draft')) as pending
FROM proposals p
LEFT JOIN project_onboarding po ON po.proposal_id = p.id
LEFT JOIN clients c ON c.id = p.client_reference_id
WHERE p.deleted_at IS NULL 
  AND p.archived_at IS NULL
  AND (p.client_id = 'CLIENT_USER_ID_HERE'::uuid 
    OR c.user_id = 'CLIENT_USER_ID_HERE'::uuid);  -- Replace with client ID

-- Test client access (replace the UUID with actual client ID)
SELECT * FROM get_dashboard_metrics_by_stage(
  'CLIENT_USER_ID_HERE'::uuid,  -- Replace with client user ID
  'client'
);

-- Expected: Should only return counts for this client's proposals

-- ============================================================
-- STEP 5: Verify Revenue Calculation
-- ============================================================

-- Check proposals with carbon credits (for revenue calculation)
SELECT 
  p.id,
  p.title,
  p.carbon_credits,
  p.client_share_percentage,
  p.system_size_kwp,
  p.commission_date,
  po.audit_ready,
  -- Manual revenue calculation for verification
  p.carbon_credits * (
    97.34 * (p.client_share_percentage / 100.0) +   -- 2025
    127.03 * (p.client_share_percentage / 100.0) +  -- 2026
    143.12 * (p.client_share_percentage / 100.0) +  -- 2027
    158.79 * (p.client_share_percentage / 100.0) +  -- 2028
    174.88 * (p.client_share_percentage / 100.0) +  -- 2029
    190.55 * (p.client_share_percentage / 100.0)    -- 2030
  ) as manual_revenue_calculation
FROM proposals p
LEFT JOIN project_onboarding po ON po.proposal_id = p.id
WHERE p.signed_at IS NOT NULL 
  AND po.audit_ready = true
  AND p.carbon_credits IS NOT NULL
  AND p.client_share_percentage IS NOT NULL
ORDER BY p.carbon_credits DESC
LIMIT 10;

-- Compare with function output
-- The audit_ready_revenue from the function should match the sum of manual calculations

-- ============================================================
-- STEP 6: Test Empty User (No Proposals)
-- ============================================================

-- Create a test user with no proposals (if needed)
-- This should return all zeros without errors

SELECT * FROM get_dashboard_metrics_by_stage(
  gen_random_uuid(),  -- Random UUID with no proposals
  'agent'
);

-- Expected:
-- audit_ready_mwp: 0
-- audit_ready_revenue: 0
-- onboarding_mwp: 0
-- pending_approval_mwp: 0

-- ============================================================
-- STEP 7: Performance Testing
-- ============================================================

-- Test execution time
EXPLAIN ANALYZE
SELECT * FROM get_dashboard_metrics_by_stage(
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  'admin'
);

-- Expected: Execution time should be < 100ms for most datasets

-- ============================================================
-- STEP 8: Data Integrity Checks
-- ============================================================

-- Check for proposals without onboarding records
SELECT 
  p.id,
  p.title,
  p.signed_at,
  po.id as onboarding_id
FROM proposals p
LEFT JOIN project_onboarding po ON po.proposal_id = p.id
WHERE p.signed_at IS NOT NULL 
  AND po.id IS NULL;

-- Expected: Should be empty (all signed proposals should have onboarding records)

-- Check for proposals with invalid status
SELECT 
  p.id,
  p.title,
  p.status,
  p.signed_at
FROM proposals p
WHERE p.status NOT IN ('draft', 'pending', 'approved', 'rejected', 'signed', 'archived')
  AND p.deleted_at IS NULL;

-- Expected: Should be empty

-- ============================================================
-- STEP 9: MWp Calculation Verification
-- ============================================================

-- Verify system_size_kwp is being divided by 1000 correctly
SELECT 
  COUNT(*) as proposal_count,
  SUM(p.system_size_kwp) as total_kwp,
  SUM(p.system_size_kwp) / 1000.0 as total_mwp,
  ROUND((SUM(p.system_size_kwp) / 1000.0)::numeric, 3) as total_mwp_rounded
FROM proposals p
LEFT JOIN project_onboarding po ON po.proposal_id = p.id
WHERE p.deleted_at IS NULL 
  AND p.archived_at IS NULL
  AND p.signed_at IS NOT NULL 
  AND po.audit_ready = true;

-- Compare with audit_ready_mwp from function

-- ============================================================
-- STEP 10: Cross-Check All Metrics
-- ============================================================

-- Comprehensive check for admin user
WITH function_result AS (
  SELECT * FROM get_dashboard_metrics_by_stage(
    (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
    'admin'
  )
),
manual_calculation AS (
  SELECT 
    COALESCE(SUM(CASE WHEN p.signed_at IS NOT NULL AND po.audit_ready = true THEN p.system_size_kwp ELSE 0 END) / 1000.0, 0) as audit_ready_mwp,
    COALESCE(SUM(CASE WHEN p.signed_at IS NOT NULL AND (po.audit_ready = false OR po.audit_ready IS NULL) THEN p.system_size_kwp ELSE 0 END) / 1000.0, 0) as onboarding_mwp,
    COALESCE(SUM(CASE WHEN p.signed_at IS NULL AND p.status IN ('pending', 'draft') THEN p.system_size_kwp ELSE 0 END) / 1000.0, 0) as pending_mwp
  FROM proposals p
  LEFT JOIN project_onboarding po ON po.proposal_id = p.id
  WHERE p.deleted_at IS NULL AND p.archived_at IS NULL
)
SELECT 
  'Function Result' as source,
  fr.audit_ready_mwp,
  fr.onboarding_mwp,
  fr.pending_approval_mwp,
  fr.audit_ready_revenue
FROM function_result fr
UNION ALL
SELECT 
  'Manual Calculation' as source,
  mc.audit_ready_mwp,
  mc.onboarding_mwp,
  mc.pending_mwp,
  NULL::numeric as audit_ready_revenue
FROM manual_calculation mc;

-- Expected: Both rows should have identical MWp values

-- ============================================================
-- STEP 11: Test Role Isolation
-- ============================================================

-- Verify agents can't see each other's data
WITH agent_a AS (
  SELECT * FROM get_dashboard_metrics_by_stage(
    (SELECT id FROM profiles WHERE role = 'agent' ORDER BY email LIMIT 1),
    'agent'
  )
),
agent_b AS (
  SELECT * FROM get_dashboard_metrics_by_stage(
    (SELECT id FROM profiles WHERE role = 'agent' ORDER BY email OFFSET 1 LIMIT 1),
    'agent'
  )
)
SELECT 
  'Agent A' as agent,
  audit_ready_mwp,
  onboarding_mwp,
  pending_approval_mwp
FROM agent_a
UNION ALL
SELECT 
  'Agent B' as agent,
  audit_ready_mwp,
  onboarding_mwp,
  pending_approval_mwp
FROM agent_b;

-- Expected: Different values (unless they happen to have identical portfolios)

-- ============================================================
-- TEST RESULTS CHECKLIST
-- ============================================================

/*
Mark each test as passing:

[ ] Step 1: System-wide counts look reasonable
[ ] Step 2: Admin sees all data
[ ] Step 3: Agent sees only their data
[ ] Step 4: Client sees only their data
[ ] Step 5: Revenue calculations are accurate
[ ] Step 6: Empty user returns zeros without errors
[ ] Step 7: Performance < 100ms
[ ] Step 8: No data integrity issues
[ ] Step 9: MWp calculations correct
[ ] Step 10: Function and manual calculations match
[ ] Step 11: Role isolation working correctly

If all tests pass: ✅ Phase 6 database testing complete!
If any fail: 🔴 Review and fix issues before proceeding
*/
