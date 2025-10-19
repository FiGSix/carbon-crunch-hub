# Phase 7: Quick Performance Test

## 5-Minute Performance Check

### Step 1: Open Dashboard (Fresh Load)
1. Open browser DevTools (F12)
2. Go to Network tab
3. Clear cache: Cmd/Ctrl + Shift + R
4. Navigate to `/dashboard`
5. Wait for page to fully load

### Step 2: Run Performance Report
In the browser console, run:
```javascript
dashboardPerformance()
```

### Step 3: Check Results

✅ **PASS Criteria:**
- Data Fetch Time: < 1000ms
- Render Time: < 500ms  
- Total Load Time: < 2000ms
- Performance Score: > 70

⚠️ **WARNING Criteria:**
- Data Fetch Time: 1000-2000ms
- Render Time: 500-1000ms
- Total Load Time: 2000-3000ms
- Performance Score: 50-70

❌ **FAIL Criteria:**
- Data Fetch Time: > 2000ms
- Render Time: > 1000ms
- Total Load Time: > 3000ms
- Performance Score: < 50

### Step 4: Test Cached Load
1. Navigate to `/proposals`
2. Navigate back to `/dashboard`
3. Run `dashboardPerformance()` again
4. Verify cached load is faster (should be 2-5x faster)

### Step 5: Check Component Performance
Run:
```javascript
performanceReport()
```

Look for:
- High render counts (> 10 per component)
- Slow render times (> 200ms per component)
- Memory leaks (check Memory tab in DevTools)

## Expected Results

### Optimal Performance
```
Dashboard Performance Report
============================

Session Count: 2

Average Metrics:
- Data Fetch: 250.00ms
- Render Time: 150.00ms
- Calculations: 25.00ms
- Total Load: 425.00ms

P95 Metrics:
- Data Fetch: 300.00ms
- Render Time: 180.00ms
- Total Load: 520.00ms

Performance Score: 95/100
```

### Acceptable Performance
```
Dashboard Performance Report
============================

Session Count: 2

Average Metrics:
- Data Fetch: 600.00ms
- Render Time: 300.00ms
- Calculations: 75.00ms
- Total Load: 975.00ms

P95 Metrics:
- Data Fetch: 750.00ms
- Render Time: 400.00ms
- Total Load: 1250.00ms

Performance Score: 75/100
```

### Poor Performance (Needs Optimization)
```
Dashboard Performance Report
============================

Session Count: 2

Average Metrics:
- Data Fetch: 1500.00ms
- Render Time: 800.00ms
- Calculations: 200.00ms
- Total Load: 2500.00ms

P95 Metrics:
- Data Fetch: 2000.00ms
- Render Time: 1200.00ms
- Total Load: 3500.00ms

Performance Score: 35/100
```

## Troubleshooting

### Slow Data Fetch

**Check database function:**
```sql
-- Run in Supabase SQL Editor
EXPLAIN ANALYZE
SELECT * FROM get_dashboard_metrics_by_stage(
  'your-user-id',
  'agent'
);
```

**Expected**: Execution time < 200ms

**If slow**, check:
- Indexes on `proposals` table
- RLS policy efficiency
- Network latency to Supabase

### Slow Render

**Check React DevTools:**
1. Open React DevTools → Profiler
2. Record a new profile
3. Navigate to dashboard
4. Stop recording
5. Look for components with long render times

**If slow**, check:
- Unnecessary re-renders
- Missing React.memo
- Inline object/array creation
- Complex calculations without useMemo

### High Memory Usage

**Check Memory in DevTools:**
1. Open DevTools → Memory tab
2. Take heap snapshot
3. Navigate around dashboard
4. Take another snapshot
5. Compare retained size

**If high**, check:
- Event listener cleanup
- useEffect cleanup functions
- Query cache size
- Large data structures

## Quick Fixes

### Fix 1: Clear Query Cache
```javascript
// In browser console
queryClient.clear()
// Then reload dashboard
```

### Fix 2: Reset Performance Monitor
```javascript
// In browser console
dashboardPerformanceMonitor.reset()
// Then test again
```

### Fix 3: Force Fresh Data
```javascript
// In browser console
queryClient.invalidateQueries({ queryKey: ['dashboard'] })
// Dashboard will refetch all data
```

## Reporting Issues

If performance fails criteria, provide:

1. **Performance Report Output**
   ```javascript
   dashboardPerformance()
   ```

2. **Overall Performance**
   ```javascript
   performanceReport()
   ```

3. **Browser Info**
   - Browser name/version
   - Operating system
   - Network speed (throttle in DevTools)

4. **Database Stats**
   ```sql
   SELECT * FROM get_dashboard_metrics_by_stage('user-id', 'role');
   -- Measure execution time
   ```

5. **Console Errors**
   - Any errors in console
   - Network failures
   - React warnings

## Success Checklist

- [ ] Fresh load completes in < 2000ms
- [ ] Cached load completes in < 500ms
- [ ] Performance score > 70
- [ ] No console errors
- [ ] No memory leaks
- [ ] Smooth animations (60fps)
- [ ] All 4 metric cards display correctly
- [ ] Recent projects load properly
