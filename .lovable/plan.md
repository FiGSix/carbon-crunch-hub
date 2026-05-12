# Cleanup: remove misleading `DEFAULT_CLIENT_SHARE = 75`

## Why

`DEFAULT_CLIENT_SHARE = 75` was defined as a "canonical default" but is **never actually consumed anywhere in business logic**. Confirmed by searching all source files: the only references are the definition itself plus three pure re-exports. Real proposal client shares come from the tiered `getClientSharePercentage(portfolioKWp)` function (60.20% → 70% based on portfolio size), and stored per-proposal `client_share_percentage` columns. The orphan `75` constant is misleading because it implies a default that doesn't match the real first-tier default of 60.20%.

In addition, `RevenueTab.tsx` has a hand-rolled `|| 75` fallback (and `|| 4` agent fallback) that hardcodes the same misleading value instead of using the tiered function the rest of the app uses.

## Scope (frontend only — no DB / SQL changes)

This cleanup is limited to TypeScript constants and one component fallback. It does **not** touch the dashboard SQL function (separate item we discussed earlier).

## Changes

### 1. `src/services/calculations/carbon/constants.ts`
Remove line: `export const DEFAULT_CLIENT_SHARE = 75; // 75%`

### 2. `src/services/calculations/carbon/index.ts`
- Remove `DEFAULT_CLIENT_SHARE` from the re-export block
- Remove `static readonly DEFAULT_CLIENT_SHARE = 75;` from `UnifiedCarbonService`

### 3. `src/lib/calculations/carbon/constants.ts`
Remove `DEFAULT_CLIENT_SHARE` from the re-export block

### 4. `src/pages/ProjectOnboardingDetail/RevenueTab.tsx`
Replace the misleading literal fallbacks with the canonical tiered functions:

```ts
// before
const clientSharePercentage = proposal.client_share_percentage || 75;
const agentCommissionPercentage = proposal.agent_commission_percentage || 4;

// after
const portfolioKWp = proposal.agent_portfolio_kwp || proposal.system_size_kwp || 0;
const clientSharePercentage =
  proposal.client_share_percentage ?? getClientSharePercentage(portfolioKWp);
const agentCommissionPercentage =
  proposal.agent_commission_percentage ??
  getAgentCommissionPercentage(portfolioKWp, undefined, !!proposal.agent_id);
```

Add the imports from `@/services/calculations/carbon/pricing`. Use `??` (not `||`) so a legitimate stored `0` isn't replaced by the fallback.

## Verification

- TypeScript build must pass (the harness runs it automatically)
- `rg "DEFAULT_CLIENT_SHARE" src` should return zero results after the change
- RevenueTab still renders for existing proposals (stored values dominate; fallback only triggers on null)

## Out of scope

- Dashboard SQL function `get_dashboard_metrics_by_stage` still has `COALESCE(..., 70)` / `COALESCE(..., 4)` fallbacks. That's a separate DB migration discussed earlier and is **not** included here.
