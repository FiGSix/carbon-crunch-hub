# Dashboard Deployment Script

## Quick Deployment Guide

This is a step-by-step deployment script to ensure smooth production deployment.

## Pre-Deployment (30 minutes before)

### 1. Verify Staging Environment
```bash
# Build the project
npm run build

# Check for TypeScript errors
npm run type-check

# Run tests if available
npm run test
```

**Expected**: No errors, all tests pass

### 2. Database Verification
Run in Supabase SQL Editor:

```sql
-- 1. Verify function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'get_dashboard_metrics_by_stage';
-- Expected: 1 row returned

-- 2. Test function for all roles
SELECT * FROM get_dashboard_metrics_by_stage('test-user-id', 'admin');
SELECT * FROM get_dashboard_metrics_by_stage('test-user-id', 'agent');
SELECT * FROM get_dashboard_metrics_by_stage('test-user-id', 'client');
-- Expected: Results returned without errors

-- 3. Check performance
EXPLAIN ANALYZE 
SELECT * FROM get_dashboard_metrics_by_stage('actual-user-id', 'agent');
-- Expected: Execution time < 300ms
```

### 3. Create Backup
```bash
# Tag current production version
git tag -a v1.0-pre-dashboard-refactor -m "Before dashboard refactoring"
git push origin v1.0-pre-dashboard-refactor

# Export database schema (in Supabase)
# Dashboard → Database → Export Schema
```

### 4. Team Notification
Send to team Slack/email:
```
🚀 Dashboard Refactoring Deployment Starting in 30 minutes

Time: [TIME]
Expected Duration: 15 minutes
Downtime: None expected

What to watch:
- Dashboard load performance
- Error rates
- User feedback

Monitoring Dashboard: [LINK]
Rollback Procedure: docs/dashboard-phase8-production-readiness.md
```

## Deployment (15 minutes)

### Step 1: Deploy Code (5 min)
```bash
# 1. Ensure on main branch
git checkout main
git pull origin main

# 2. Verify last commit
git log -1
# Confirm this is the dashboard refactoring commit

# 3. Deploy (method depends on your setup)

# Option A: Lovable Deploy
# Click "Publish" button in Lovable UI

# Option B: Manual Deploy
# npm run build
# Deploy build/ folder to hosting

# Option C: CI/CD
# git push triggers automatic deployment
```

### Step 2: Verify Deployment (5 min)
```bash
# 1. Check deployment status
# Visit your deployment platform dashboard

# 2. Verify site is accessible
curl https://your-site.com/health
# or open in browser

# 3. Check dashboard loads
# Open browser → Navigate to /dashboard
# Should load without errors
```

### Step 3: Quick Smoke Tests (5 min)

#### Test 1: Dashboard Loads
- [ ] Navigate to /dashboard
- [ ] All 4 metric cards visible
- [ ] Recent projects section loads
- [ ] No console errors

#### Test 2: Performance Check
In browser console:
```javascript
dashboardPerformance()
```
- [ ] Performance score > 70
- [ ] Total load time < 2000ms

#### Test 3: Role-Based Access
- [ ] Login as admin → See all proposals
- [ ] Login as agent → See only their proposals
- [ ] Login as client → See only their proposals

## Post-Deployment Monitoring (First Hour)

### Immediate Checks (Every 5 minutes for 30 minutes)

```bash
# Check error logs
# In your logging platform or:
grep "Dashboard Error" logs.txt

# Monitor performance
# In browser console:
dashboardPerformance()
performanceReport()
```

**Green Flags** ✅:
- Error rate < 0.1%
- Average load time < 2000ms
- No user complaints
- Metrics displaying correctly

**Red Flags** 🚨:
- Error rate > 1%
- Load time > 3000ms
- User reports of issues
- Blank or incorrect metrics

### If Red Flags Detected → ROLLBACK

## Rollback Procedure (If Needed)

### Emergency Rollback (< 5 minutes)

```bash
# 1. Revert to previous version
git checkout v1.0-pre-dashboard-refactor

# 2. Deploy immediately
# Use your deployment method (Lovable/CI/CD/Manual)

# 3. Verify rollback
# Test dashboard loads correctly
# Check metrics display

# 4. Notify team
# "Dashboard deployment rolled back due to [ISSUE]"
```

### Post-Rollback Actions
1. Document what went wrong
2. Fix issues in development
3. Re-test in staging
4. Schedule new deployment

## Extended Monitoring (First 24 Hours)

### Hour 1-4: Active Monitoring
Check every 30 minutes:
- [ ] Error rates
- [ ] Performance metrics
- [ ] User feedback
- [ ] Database performance

### Hour 4-24: Passive Monitoring
Check every 4 hours:
- [ ] Daily error summary
- [ ] Performance trends
- [ ] Support tickets
- [ ] User engagement metrics

## Day 1 Report Template

Send after 24 hours:

```
Dashboard Refactoring: Day 1 Report
===================================

Deployment: ✅ Successful
Date: [DATE]
Time: [TIME]

Metrics:
--------
Average Load Time: [X]ms (Target: <2000ms)
Performance Score: [X]/100 (Target: >70)
Error Rate: [X]% (Target: <0.1%)
Uptime: [X]% (Target: 99.9%)

Issues:
-------
- [None / List issues]

User Feedback:
--------------
- [Positive / Negative / Neutral]

Next Steps:
-----------
- Continue monitoring for 7 days
- Address any issues found
- Plan optimization if needed

Status: 🟢 Green / 🟡 Yellow / 🔴 Red
```

## Week 1 Monitoring Checklist

### Daily Checks
- [ ] Monday: Check error rates and performance
- [ ] Tuesday: Review user feedback
- [ ] Wednesday: Mid-week performance review
- [ ] Thursday: Check for optimization opportunities
- [ ] Friday: Weekly report and retrospective

### Red Flags That Require Action
- Error rate > 0.5%
- Performance score < 60
- User complaints > 5
- Load time increasing over time
- Memory leaks detected

## Success Criteria

Deployment is considered successful when:
- ✅ 7 days in production without major issues
- ✅ Performance score consistently > 70
- ✅ Error rate < 0.1%
- ✅ No increase in support tickets
- ✅ User feedback neutral or positive

## When to Remove Old Code

After deployment is stable (2-4 weeks):

```bash
# 1. Remove deprecated hooks (if not used elsewhere)
# - useDashboardStats (marked deprecated)
# - useDashboardComputedData (marked deprecated)
# - useOptimizedDashboardStats (marked deprecated)

# 2. Remove old documentation
# Keep Phase 1-8 docs for reference

# 3. Clean up comments
# Remove "DEPRECATED" comments
# Update JSDoc

# 4. Final cleanup commit
git commit -m "chore: remove deprecated dashboard code"
git push origin main
```

## Troubleshooting Common Issues

### Issue: Dashboard Won't Load

**Quick Fix**:
```javascript
// Clear React Query cache
queryClient.clear()
// Hard refresh: Cmd/Ctrl + Shift + R
```

**If That Fails**: Rollback

### Issue: Metrics Show 0

**Quick Fix**:
```sql
-- Check if data exists
SELECT COUNT(*) FROM proposals WHERE agent_id = 'user-id';

-- If data exists but function returns 0:
-- Check user role
SELECT role FROM user_roles WHERE user_id = 'user-id';
```

**If Issue Persists**: Check RLS policies

### Issue: Slow Performance

**Quick Fix**:
```javascript
// Check what's slow
dashboardPerformance()

// If data fetch is slow (>1000ms):
// Check database performance in Supabase dashboard
```

**If Issue Persists**: Review database indexes

## Emergency Contacts

```
Deployment Lead: [NAME] - [CONTACT]
Database Admin: [NAME] - [CONTACT]
DevOps: [NAME] - [CONTACT]
On-Call Engineer: [NAME] - [CONTACT]
```

## Deployment Sign-Off

```
Pre-Deployment Checklist: ✅ Complete
Deployment Status: ✅ Success / ❌ Failed / ⏸️ Rolled Back
Post-Deployment Monitoring: ✅ Active

Signed Off By:
- Tech Lead: [NAME] [DATE]
- QA Lead: [NAME] [DATE]
- Product Owner: [NAME] [DATE]

Notes:
[Any additional notes or observations]
```

## Reference Links

- Full Documentation: `/docs/dashboard-phase8-production-readiness.md`
- Performance Guide: `/docs/dashboard-phase7-performance.md`
- Testing Guide: `/docs/dashboard-phase6-testing-guide.md`
- All Phases: `/docs/dashboard-phase*.md`

---

**Remember**: When in doubt, rollback and reassess. It's better to delay than to deploy broken code.
