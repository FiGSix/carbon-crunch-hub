

# Fix: Thread client share override into rate-per-ton display

## Status
The previous fix correctly updated the **calculation engine** (`calculateComplete`) to respect `clientShareOverride`, but the **table display** still calls `clientPricing.ts` functions that ignore the override. This means the "Client Carbon Price (R/tCO₂e)" column and per-row revenue in the table still use the tier-calculated share (60.20%) instead of the override (e.g. 65%).

## Changes (4 files, ~15 lines)

**1. `src/lib/calculations/carbon/clientPricing.ts`**
Add optional `clientShareOverride?: number` parameter to both functions. Use it instead of `getClientSharePercentage()` when provided.

**2. `src/components/proposals/summary/carbon/CarbonCreditTable.tsx`**
- Add `clientShareOverride?: number` to props interface
- Pass it to `getFormattedClientSpecificCarbonPrice` and `calculateClientSpecificRevenue` calls

**3. `src/components/proposals/summary/carbon/CarbonCreditTableWrapper.tsx`**
- Add `clientShareOverride?: number` to props interface
- Forward it to all `CarbonCreditTable` instances

**4. `src/components/proposals/summary/CarbonCreditSection.tsx`**
- Pass `clientShareOverride` to `CarbonCreditTableWrapper` (value already available as a prop)

No database changes.

