# Phase 6: Quick Start Testing Guide

**Status:** Ready for Testing  
**Estimated Time:** 30-45 minutes  
**Current User Location:** `/login` page

---

## Quick Testing Steps

### 1. Test as Admin User (5 minutes)

**Login:**
- Navigate to `/login`
- Log in with admin credentials
- Navigate to `/dashboard`

**What to Check:**
- ✅ All 4 metric cards display with data
- ✅ Card 1: "Audit Ready Projects" shows total MWp across all users
- ✅ Card 2: "Total Revenue (2025-2030)" shows aggregated revenue
- ✅ Card 3: "Onboarding Projects" shows all onboarding projects
- ✅ Card 4: "Proposal(s) Pending" shows all pending proposals
- ✅ Recent Projects table shows proposals from multiple agents/clients
- ✅ No console errors (press F12 to check)

**Screenshot:** Take a screenshot for comparison

---

### 2. Test as Agent User (5 minutes per agent)

**Login:**
- Log out from admin account
- Log in with agent credentials
- Navigate to `/dashboard`

**What to Check:**
- ✅ Metrics show ONLY this agent's projects
- ✅ Numbers are DIFFERENT from admin view
- ✅ Recent Projects shows only agent's proposals
- ✅ Cannot see other agents' projects

**Test with Second Agent:**
- Log out and log in as a different agent
- Verify the metrics are DIFFERENT from first agent
- This confirms data isolation is working

**Screenshot:** Take screenshots of both agents' dashboards

---

### 3. Test as Client User (5 minutes per client)

**Login:**
- Log out from agent account
- Log in with client credentials
- Navigate to `/dashboard`

**What to Check:**
- ✅ Metrics show ONLY this client's projects
- ✅ Numbers are DIFFERENT from admin/agent views
- ✅ Recent Projects shows only client's proposals
- ✅ Client sees minimal data (only their portfolio)

**Screenshot:** Take a screenshot

---

### 4. Quick Database Verification (10 minutes)

**Open Supabase SQL Editor:**
1. Go to: https://supabase.com/dashboard/project/uyjryuopuqgmsvayiccl/sql/new
2. Run this quick test query:

```sql
-- Quick system check
SELECT 
  COUNT(*) as total_proposals,
  COUNT(*) FILTER (WHERE signed_at IS NOT NULL) as signed,
  COUNT(*) FILTER (WHERE signed_at IS NULL AND status IN ('pending', 'draft')) as pending
FROM proposals
WHERE deleted_at IS NULL AND archived_at IS NULL;
```

3. Compare the numbers with what admin sees on dashboard
4. If they match ✅ database function is working correctly

---

### 5. Test Responsive Design (5 minutes)

**Desktop (1920px):**
- Open dashboard
- Verify 4 cards display in a single row

**Tablet (768px):**
- Resize browser or use DevTools (F12 > Toggle Device Toolbar)
- Verify cards display 2 per row

**Mobile (375px):**
- Resize to mobile size
- Verify cards stack vertically (1 per row)

---

### 6. Test Refresh Functionality (2 minutes)

**Steps:**
1. On dashboard, note current metrics
2. Click "Refresh Data" button (top right)
3. Verify loading spinner appears briefly
4. Verify metrics reload (should be same if no changes)

**Expected:**
- ✅ No errors
- ✅ Loading states work
- ✅ Data refreshes successfully

---

## Common Issues & Quick Fixes

### Issue: "Failed to load dashboard data"
**Fix:** 
- Check console for errors (F12)
- Verify user is logged in
- Try refreshing the page
- Check Supabase connection in SQL editor

### Issue: All cards show "0.000 MWp"
**Possible Causes:**
- User has no proposals (this is correct)
- Role-based filtering too restrictive
- Database function error

**Fix:**
- Check if user actually has proposals
- Run SQL verification query
- Check console for RPC errors

### Issue: Cards show same data for all users
**Problem:** Role-based filtering not working

**Fix:**
- Verify `get_dashboard_metrics_by_stage` function exists
- Check user's role in profiles table:
```sql
SELECT id, email, role FROM profiles WHERE email = 'user@example.com';
```
- Verify RLS policies are enabled

### Issue: Revenue seems incorrect
**Fix:**
- Check if proposals have `carbon_credits` populated
- Verify `client_share_percentage` is set
- Check commission dates are before 2025
- Run revenue verification SQL from testing script

---

## Success Criteria (All Must Pass)

Before moving to Phase 7, verify:

- [ ] ✅ Admin sees all system data
- [ ] ✅ Agents see only their data
- [ ] ✅ Clients see only their data
- [ ] ✅ Different agents see different metrics
- [ ] ✅ Different clients see different metrics
- [ ] ✅ All 4 cards display correctly
- [ ] ✅ Revenue calculations look reasonable
- [ ] ✅ Responsive design works (mobile/tablet/desktop)
- [ ] ✅ Refresh button works
- [ ] ✅ No console errors
- [ ] ✅ Performance is acceptable (< 2 seconds load)
- [ ] ✅ Recent Projects table works

---

## Next Steps

Once all tests pass:
1. Document any issues found
2. Take screenshots for documentation
3. Mark Phase 6 as complete ✅
4. Proceed to Phase 7: Performance Testing & Optimization

---

## Need Help?

**For SQL Testing:**
- See: `docs/dashboard-phase6-sql-tests.sql`

**For Detailed Testing:**
- See: `docs/dashboard-phase6-testing-guide.md`

**For Issues:**
- Check console logs (F12)
- Check Supabase logs
- Review RLS policies
- Verify database function exists
