
# Fix Agent Commission Data and Platform Revenue Calculation

## Problem Summary

61 proposals have incorrect agent commission percentages stored, causing wrong platform revenue calculations. Additionally, the dashboard RPC function uses hardcoded defaults instead of the actual stored values.

## Two Examples of Agents with Override Issues

### Example 1: Samantha Basson
- **Profile Override:** 7%
- **Stored on Proposals:** 4%
- **Impact:** 15 proposals underpaying agent by 3%

### Example 2: Adri-Mari Harrington
- **Profile Override:** 10%
- **Stored on Proposals:** 7%
- **Impact:** 14 proposals underpaying agent by 3%

---

## Affected Data Summary

| Agent | Should Be | Stored As | Count |
|-------|-----------|-----------|-------|
| Shaun Slabber | 0% | 4%, 5% | 22 |
| Samantha Basson | 7% | 4% | 15 |
| Adri-Mari Harrington | 10% | 7% | 14 |
| Craig Scott | 7% | 4% | 5 |
| Mitesh Bhawan | 7% | 5% | 2 |
| MARK WELLS | 7% | 4% | 2 |
| Jacques Goosen | 7% | 4% | 1 |
| **Total** | - | - | **61** |

---

## Solution: Two-Part Fix

### Part 1: Data Migration - Fix 61 Proposals

Create a migration to update stored `agent_commission_percentage` values to match each agent's `commission_override` from their profile:

```text
UPDATE proposals p
SET agent_commission_percentage = pr.commission_override
FROM profiles pr
WHERE p.agent_id = pr.id
  AND pr.commission_override IS NOT NULL
  AND p.agent_commission_percentage != pr.commission_override
  AND p.deleted_at IS NULL
```

### Part 2: Fix Dashboard RPC Function

Update `get_dashboard_metrics_by_stage` to:
1. Use stored `p.client_share_percentage` instead of hardcoded 70%
2. Use stored `p.agent_commission_percentage` instead of hardcoded 4%
3. Calculate platform share as: `100 - client_share - agent_commission`
4. Restore tiered carbon pricing (~R891.71/credit over 6 years)

### Part 3: Fix Bulk Upload Function

Correct the legacy bug in `bulk-upload-legacy-projects/index.ts`:
- Line 173: Change `5` to `4` for low-tier commission
- Line 175: Change `4` to `7` for high-tier commission (currently reversed)

---

## Technical Details

### Files to Modify

| File | Change |
|------|--------|
| `supabase/migrations/[timestamp]_fix_agent_commissions.sql` | New migration to fix 61 proposals |
| `supabase/migrations/[timestamp]_fix_dashboard_revenue.sql` | Fix RPC to use stored values |
| `supabase/functions/bulk-upload-legacy-projects/index.ts` | Fix hardcoded 5% bug |

### Migration 1: Fix Proposal Data

```sql
-- Fix all proposals where agent has commission_override
UPDATE proposals p
SET 
  agent_commission_percentage = pr.commission_override,
  updated_at = now()
FROM profiles pr
WHERE p.agent_id = pr.id
  AND pr.commission_override IS NOT NULL
  AND p.agent_commission_percentage IS DISTINCT FROM pr.commission_override
  AND p.deleted_at IS NULL
  AND p.archived_at IS NULL;
```

### Migration 2: Fix Dashboard RPC

The `get_dashboard_metrics_by_stage` function will be updated to:
- Read `p.client_share_percentage` directly from each proposal
- Read `p.agent_commission_percentage` directly from each proposal
- Calculate platform revenue as: `carbon_credits * tiered_price * ((100 - client_share - agent_commission) / 100)`
- Use the correct tiered carbon prices (R97.34 to R190.55 per year)

### Edge Function Fix

```typescript
// Current (WRONG):
if (totalPortfolioKwp < 15000) {
  agentCommissionPercentage = 5; // Should be 4
} else {
  agentCommissionPercentage = 4; // Should be 7
}

// Fixed:
if (totalPortfolioKwp < 15000) {
  agentCommissionPercentage = 4; // AGENT_COMMISSION_LOW
} else {
  agentCommissionPercentage = 7; // AGENT_COMMISSION_HIGH
}
```

---

## Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| Proposals with correct commission | ~830 | ~891 (all) |
| Shaun Slabber proposals | 0%/4%/5% mixed | 0% (correct) |
| Samantha Basson proposals | 4% | 7% (correct) |
| Adri-Mari Harrington proposals | 7% | 10% (correct) |
| Pending Approval Revenue | ~R48m | ~R72m |
| Future bulk uploads | 5% bug | Uses correct 4%/7% |

---

## Verification Queries

After applying fixes, run these queries to verify:

```sql
-- Verify no more mismatches exist
SELECT COUNT(*) 
FROM proposals p
JOIN profiles pr ON pr.id = p.agent_id
WHERE pr.commission_override IS NOT NULL
  AND p.agent_commission_percentage != pr.commission_override
  AND p.deleted_at IS NULL;
-- Expected: 0

-- Verify dashboard revenue restored
SELECT * FROM get_dashboard_metrics_by_stage('admin-user-id');
-- Expected: Card 6 revenue ~R72m
```
