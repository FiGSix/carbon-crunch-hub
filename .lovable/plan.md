

# Fix: Calculation Engine Ignores Stored Client Share Override

## Root Cause

The `calculateComplete` function in `src/services/calculations/carbon/core.ts` **always recalculates** `clientSharePercentage` from the portfolio-size tier formula (`getClientSharePercentage(portfolioKWp)`). It never accepts or uses the stored `client_share_percentage` override from the proposal record.

So when an admin sets Mall @ Reds to 65%, that value is saved to the `proposals` table, and the **display** in `RevenueDistributionSection.tsx` correctly reads it (line 73: `proposalData?.client_share_percentage ?? getClientSharePercentage(...)`). But the **revenue calculation** still runs through `calculateComplete` which recomputes 60.20% based on the portfolio size tier.

```text
Display path:  proposals.client_share_percentage → shows "65%" ✓
Calc path:     getClientSharePercentage(portfolioKWp) → uses 60.20% ✗
```

## Fix

**1. Add `clientShareOverride` to `SystemSpecs` type** (`src/services/calculations/carbon/types.ts`)

Add an optional `clientShareOverride?: number` field to `SystemSpecs`.

**2. Use override in `calculateComplete`** (`src/services/calculations/carbon/core.ts`)

Change both single-phase and multi-phase paths:
```typescript
// Before:
const clientSharePercentage = getClientSharePercentage(effectivePortfolioKWp);

// After:
const clientSharePercentage = specs.clientShareOverride ?? getClientSharePercentage(effectivePortfolioKWp);
```

**3. Pass stored override from `useRevenueCalculations`** (`src/components/proposals/summary/carbon/hooks/useRevenueCalculations.ts`)

The hook needs access to `proposalData?.client_share_percentage` and must pass it into `specs.clientShareOverride` when calling `calculateComplete`.

**4. Pass stored override from `unifiedProposalService`** (`src/services/proposals/unifiedProposalService.ts`)

When recalculating during proposal creation/update, the override should flow through if `client_share_percentage` is explicitly set on the proposal.

**5. Pass stored override from `revenueCalculators.ts`** (`src/utils/proposals/revenueCalculators.ts`)

Add `clientShareOverride` parameter to `calculateCompleteProposalFinancials`.

## Summary
- 5 files changed, ~15 lines total
- The fix ensures that when an admin explicitly sets a client share percentage, the calculation engine respects it instead of recalculating from the tier formula
- No database changes needed

