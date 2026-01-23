
# Fix Dashboard RPC Carbon Price Sum Discrepancy

## Problem
The `get_dashboard_metrics_by_stage` RPC function uses an incorrect carbon price sum (R872.75) that doesn't match the actual tiered prices defined in `CARBON_PRICES` constants (sum = R891.71). This causes a R112,644 discrepancy between the "Vintage Revenue Breakdown" card and the "Vintage 2025 Est. Revenue" metrics card.

## Root Cause
Line 70-72 of the RPC migration hardcodes a wrong sum with incorrect values in the comment.

## Solution
Update the RPC function to use the correct sum of R891.71 (matching the `CARBON_PRICES` constants).

---

## Technical Implementation

### File to Modify
`supabase/migrations/[new]_fix_carbon_price_sum.sql`

### Change Required
Update the `carbon_prices` CTE from:
```sql
carbon_prices AS (
  SELECT 
    -- Sum of 6 years of tiered pricing: R97.34 + R118.49 + R134.06 + R156.60 + R175.71 + R190.55 = R872.75
    872.75 AS total_6yr_price
)
```

To:
```sql
carbon_prices AS (
  SELECT 
    -- Sum of 6 years of tiered pricing matching CARBON_PRICES constants:
    -- 2025: R97.34 + 2026: R127.03 + 2027: R143.12 + 2028: R158.79 + 2029: R174.88 + 2030: R190.55 = R891.71
    891.71 AS total_6yr_price
)
```

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| "Vintage 2025 Est. Revenue (2025-2030)" | R5,185,092 | R5,297,736 |
| Discrepancy with Vintage Breakdown | R112,644 | R0 |

The two cards will now show matching values for the 2025-2030 revenue (excluding Blend, which is calculated separately in the breakdown card but not included in the summary metric).
