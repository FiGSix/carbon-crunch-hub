## Goal

Below each percentage in the "Revenue Distribution" cards (Client / Agent / Platform), show the actual rand value that party will earn over the life of the proposal, respecting the existing role-based visibility (admins see all three, agents see all three, clients see only their card).

## Where this lives

`src/components/proposals/summary/RevenueDistributionSection.tsx` renders the three cards. It currently knows only the share percentages — not the rand amounts. The rand totals are calculated one level up in `CarbonCreditSection.tsx` via the `useRevenueCalculations` hook (it produces `clientSpecificRevenue` keyed by year, and `CarbonCreditSection` sums them into `totalClientSpecificRevenue`).

## Approach

Compute the total revenue pool inside `RevenueDistributionSection` itself by reusing the same hooks the carbon section already uses (`usePortfolioData` + `useRevenueCalculations`). Both hooks are cached, so this adds no extra DB or compute cost — the second caller hits the in-memory cache populated by `CarbonCreditSection`.

From the client total + the locked client share %, derive the full pool, then multiply by each party's share to get rand values:

```text
clientRevenue   = sum(clientSpecificRevenue by year)        // already cached
totalPool       = clientRevenue / (clientSharePercentage/100)
agentRevenue    = totalPool * (agentCommissionPercentage/100)
platformRevenue = totalPool * (crunchCarbonSharePercentage/100)
```

All three values use the same carbon-price curve and commission dates that drive the "Client Revenue by Year" table, so the numbers will be internally consistent.

## Visibility rules (unchanged)

- Admin → Client + Agent + Platform cards, each with rand value
- Agent → Client + Agent + Platform cards, each with rand value
- Client → Client card only, with rand value

## Changes

1. `RevenueDistributionSection.tsx`
   - Accept the same inputs needed for revenue calc (`commissionDate`, `phases`, `isMultiPhase`) via new optional props, with sensible fallbacks for callers that don't have them (e.g. legacy summary screens).
   - Call `usePortfolioData` and `useRevenueCalculations` (same args used by sibling `CarbonCreditSection`) to get `totalClientSpecificRevenue`.
   - Compute the three rand values from the percentages.
   - Render each rand value as a secondary line under the existing percentage, formatted as `R {amount}` using `toLocaleString('en-ZA')` and rounded to the nearest rand.
   - Keep the existing "Based on … portfolio" / "Rate locked at creation" / "Platform fee" footers.
   - While `revenueLoading` is true, keep the existing skeleton state and only render rand values once loaded.

2. Pass the extra props from the three call sites so the rand values render in every context:
   - `src/components/proposals/SummaryStep.tsx` (admin/agent create flow)
   - `src/components/client/submit-project/ClientSummaryStep.tsx` (client submit flow)
   - `src/components/proposals/view/ProposalDetails.tsx` (saved proposal view, including token-based client view)

All three already have `projectInfo.commissionDate`, `projectInfo.phases`, and `projectInfo.isMultiPhase` in scope.

## Out of scope

- No DB schema changes.
- No changes to how percentages are calculated, locked, or stored.
- No changes to the carbon-credit table or yearly breakdown above.
- No backend / edge-function changes.
