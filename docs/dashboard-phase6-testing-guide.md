# Phase 6: Role-Based Behavior Testing Guide

**Date:** 2025-10-19  
**Phase:** 6 of 10  
**Purpose:** Verify dashboard metrics display correctly for all user roles with proper data isolation

---

## Testing Overview

The new dashboard uses the `get_dashboard_metrics_by_stage` database function which implements role-based filtering at the database level. This ensures:
- **Admins** see all projects across all agents/clients
- **Agents** see only their assigned projects
- **Clients** see only their own projects

---

## Pre-Testing Checklist

### ✅ Database Function Status
- [x] `get_dashboard_metrics_by_stage` function created
- [ ] Function tested with different role parameters
- [ ] RLS policies verified for proposals and project_onboarding tables

### ✅ Frontend Components Status
- [x] `DashboardMetricsByStageCards` component created
- [x] `useDashboardMetricsByStage` hook implemented
- [x] Dashboard.tsx updated to use new components
- [ ] Visual verification on all screen sizes

### ✅ Test Data Requirements
- [ ] At least 1 admin user
- [ ] At least 2 agent users (to test data isolation)
- [ ] At least 2 client users (to test data isolation)
- [ ] Proposals in various states:
  - [ ] Audit ready (signed + audit_ready = true)
  - [ ] Onboarding (signed but audit_ready = false)
  - [ ] Pending approval (not signed, status = 'pending' or 'draft')

---

## Test Scenarios

### Test 1: Admin Role - Full Access ✓

**Expected Behavior:**
- Admin should see ALL projects from all agents and clients
- All 4 cards should aggregate data across entire system

**Test Steps:**
1. Log in as admin user
2. Navigate to dashboard (`/dashboard`)
3. Verify all 4 cards display with aggregated data:
   - Card 1: Audit Ready Projects (all audit-ready projects system-wide)
   - Card 2: Total Revenue 2025-2030 (sum of all audit-ready revenue)
   - Card 3: Onboarding Projects (all signed but not audit-ready)
   - Card 4: Proposals Pending (all pending/draft proposals)

**Verification SQL:**
```sql
-- Run this as admin to verify expected counts
SELECT 
  COUNT(*) FILTER (WHERE signed_at IS NOT NULL AND po.audit_ready = true) as audit_ready_count,
  COUNT(*) FILTER (WHERE signed_at IS NOT NULL AND (po.audit_ready = false OR po.audit_ready IS NULL)) as onboarding_count,
  COUNT(*) FILTER (WHERE signed_at IS NULL AND status IN ('pending', 'draft')) as pending_count
FROM proposals p
LEFT JOIN project_onboarding po ON po.proposal_id = p.id
WHERE p.deleted_at IS NULL AND p.archived_at IS NULL;
```

**Expected Results:**
- [ ] All metrics show system-wide totals
- [ ] No empty cards (if data exists in system)
- [ ] Revenue calculations include all audit-ready projects
- [ ] Recent Projects table shows projects from multiple agents/clients

---

### Test 2: Agent Role - Agent-Specific Data ✓

**Expected Behavior:**
- Agent should ONLY see projects they created (where `agent_id = auth.uid()`)
- Should NOT see other agents' projects
- All 4 cards should filter by agent's projects only

**Test Steps:**
1. Log in as Agent A
2. Navigate to dashboard
3. Note down the metrics displayed
4. Log out and log in as Agent B
5. Verify Agent B sees DIFFERENT metrics (their own projects)

**Verification SQL (as Agent A):**
```sql
-- Run this to see what Agent A should see
SELECT 
  COUNT(*) FILTER (WHERE signed_at IS NOT NULL AND po.audit_ready = true) as audit_ready_count,
  COUNT(*) FILTER (WHERE signed_at IS NOT NULL AND (po.audit_ready = false OR po.audit_ready IS NULL)) as onboarding_count,
  COUNT(*) FILTER (WHERE signed_at IS NULL AND status IN ('pending', 'draft')) as pending_count
FROM proposals p
LEFT JOIN project_onboarding po ON po.proposal_id = p.id
WHERE p.deleted_at IS NULL 
  AND p.archived_at IS NULL
  AND p.agent_id = (SELECT id FROM profiles WHERE email = 'agent-a@example.com');
```

**Expected Results:**
- [ ] Metrics show only agent's own projects
- [ ] Different agents see different numbers
- [ ] Agent cannot see proposals from other agents
- [ ] Recent Projects table shows only agent's proposals

---

### Test 3: Client Role - Client-Specific Data ✓

**Expected Behavior:**
- Client should ONLY see their own projects
- Filtering by `client_id = auth.uid()` OR `client_reference_id` matches client record
- Client should see minimal data (their own projects only)

**Test Steps:**
1. Log in as Client A
2. Navigate to dashboard
3. Verify only their projects are visible
4. Log out and log in as Client B
5. Verify Client B sees completely different data

**Verification SQL (as Client A):**
```sql
-- Run this to see what Client A should see
SELECT 
  COUNT(*) FILTER (WHERE signed_at IS NOT NULL AND po.audit_ready = true) as audit_ready_count,
  COUNT(*) FILTER (WHERE signed_at IS NOT NULL AND (po.audit_ready = false OR po.audit_ready IS NULL)) as onboarding_count,
  COUNT(*) FILTER (WHERE signed_at IS NULL AND status IN ('pending', 'draft')) as pending_count
FROM proposals p
LEFT JOIN project_onboarding po ON po.proposal_id = p.id
LEFT JOIN clients c ON c.id = p.client_reference_id
WHERE p.deleted_at IS NULL 
  AND p.archived_at IS NULL
  AND (p.client_id = (SELECT id FROM profiles WHERE email = 'client-a@example.com')
    OR c.user_id = (SELECT id FROM profiles WHERE email = 'client-a@example.com'));
```

**Expected Results:**
- [ ] Client sees only their own projects
- [ ] Multiple clients see isolated data
- [ ] Client cannot see other clients' projects
- [ ] Metrics are personalized to client's portfolio

---

### Test 4: Empty State Testing ✓

**Expected Behavior:**
- New users or users with no projects should see zeros, not errors

**Test Steps:**
1. Create a new agent/client user with no proposals
2. Log in as that user
3. Navigate to dashboard

**Expected Results:**
- [ ] All 4 cards display "0.000 MWp" or "R 0"
- [ ] No errors in console
- [ ] No loading spinners stuck
- [ ] Recent Projects shows "No proposals found" message
- [ ] Refresh button works

---

### Test 5: Revenue Calculation Accuracy ✓

**Expected Behavior:**
- Revenue should be calculated for years 2025-2030 only
- Pro-rating should apply for 2025 if commissioned mid-year
- Client share percentage should be applied correctly

**Test Data Setup:**
Create a test proposal with known values:
- System Size: 500 kWp
- Commission Date: 2023-06-15 (mid-year)
- Carbon Credits: 665 tCO2/year
- Client Share: 60.2%

**Expected Revenue Calculation:**
```
2025: 665 × 97.34 × 60.2% × (remaining days / 365) = ~38,948 × pro-rate
2026: 665 × 127.03 × 60.2% = R 50,846
2027: 665 × 143.12 × 60.2% = R 57,218
2028: 665 × 158.79 × 60.2% = R 63,491
2029: 665 × 174.88 × 60.2% = R 69,924
2030: 665 × 190.55 × 60.2% = R 76,205
Total: ~R 356,632 (depending on pro-rate)
```

**Test Steps:**
1. Mark the test proposal as audit ready
2. Check Card 2 "Total Revenue (2025-2030)"
3. Verify the calculated value matches expected

**Expected Results:**
- [ ] Revenue calculation is accurate
- [ ] Pro-rating works for 2025
- [ ] No revenue for years before commission date
- [ ] Client share percentage applied correctly

---

### Test 6: Performance Testing ✓

**Expected Behavior:**
- Dashboard should load quickly even with many proposals
- No lag when switching between users
- Query should complete in <100ms

**Test Steps:**
1. Log in as admin (most data to load)
2. Open browser DevTools > Network tab
3. Navigate to dashboard
4. Check the RPC call to `get_dashboard_metrics_by_stage`

**Expected Results:**
- [ ] Initial page load < 2 seconds
- [ ] RPC call completes in < 100ms
- [ ] No console errors or warnings
- [ ] Smooth animations on cards
- [ ] Refresh button works instantly

---

### Test 7: Real-Time Updates ✓

**Expected Behavior:**
- When proposal status changes, metrics should update after refresh
- Cache invalidation should work correctly

**Test Steps:**
1. Open dashboard as admin
2. Note current metrics
3. In another tab, mark a proposal as audit ready (via onboarding page)
4. Return to dashboard and click "Refresh Data"
5. Verify metrics updated

**Expected Results:**
- [ ] Metrics update after refresh
- [ ] Cache invalidates correctly
- [ ] No stale data displayed
- [ ] Loading states work properly

---

### Test 8: Responsive Design ✓

**Expected Behavior:**
- Dashboard should look good on all screen sizes
- Cards should stack properly on mobile

**Test Steps:**
1. Open dashboard on desktop (1920px)
2. Open on tablet (768px)
3. Open on mobile (375px)

**Expected Results:**
- [ ] Desktop: 4 cards in a row
- [ ] Tablet: 2 cards per row
- [ ] Mobile: 1 card per row (stacked)
- [ ] All text is readable
- [ ] Icons are properly sized
- [ ] No horizontal scrolling

---

### Test 9: Error Handling ✓

**Expected Behavior:**
- Graceful error handling when database is unavailable
- User-friendly error messages
- Retry mechanism works

**Test Steps:**
1. Simulate database error (temporarily break Supabase connection)
2. Try to load dashboard
3. Click retry button

**Expected Results:**
- [ ] Error message displays clearly
- [ ] No white screen of death
- [ ] Retry button works
- [ ] Loading states clear after error
- [ ] Console logs helpful debug info

---

### Test 10: Cross-Browser Testing ✓

**Browsers to Test:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Expected Results:**
- [ ] Consistent layout across browsers
- [ ] No CSS issues
- [ ] All functionality works
- [ ] Performance is acceptable

---

## Testing Checklist Summary

### Critical Tests (Must Pass)
- [ ] Test 1: Admin sees all data
- [ ] Test 2: Agents see only their data
- [ ] Test 3: Clients see only their data
- [ ] Test 4: Empty states work
- [ ] Test 5: Revenue calculations accurate

### Important Tests (Should Pass)
- [ ] Test 6: Performance acceptable
- [ ] Test 7: Real-time updates work
- [ ] Test 8: Responsive design works
- [ ] Test 9: Error handling graceful
- [ ] Test 10: Cross-browser compatible

---

## Known Issues & Limitations

### Current Limitations:
1. Revenue calculation assumes projects commissioned before 2025
2. No historical data for projects commissioned after 2030
3. Cache expires after 2 minutes (may need adjustment)

### Future Enhancements:
1. Add tooltips explaining each metric
2. Add drill-down capability to see project details
3. Add export functionality for metrics
4. Add comparison with previous period

---

## Troubleshooting Guide

### Issue: Cards showing zeros when data exists
**Possible Causes:**
- Role-based filtering too restrictive
- RLS policies blocking data access
- User not authenticated

**Solution:**
1. Check console for errors
2. Verify user role in profiles table
3. Test database function directly in SQL editor

### Issue: Revenue calculation seems wrong
**Possible Causes:**
- Pro-rating not working correctly
- Client share percentage incorrect
- Commission date in wrong format

**Solution:**
1. Check `commission_date` field in proposals table
2. Verify `client_share_percentage` is populated
3. Test revenue calculation SQL manually

### Issue: Performance is slow
**Possible Causes:**
- Too many proposals to process
- Missing database indexes
- Network latency

**Solution:**
1. Check query execution time in Supabase dashboard
2. Add indexes if needed
3. Optimize database function

---

## Sign-Off

Once all tests pass, Phase 6 is complete. Document any issues found and create tickets for fixes.

**Tested By:** _________________  
**Date:** _________________  
**Role:** _________________  
**Status:** ☐ Passed ☐ Failed ☐ Partial  
**Notes:** _________________
