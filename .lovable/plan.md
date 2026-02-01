
# Phase 2 Debug & Fix Plan - Partner API Calculations

## Summary

Critical issues were discovered in the Partner API's carbon credit calculation logic. The formulas used don't match Crunch Carbon's established calculation methodology, which would result in dramatically incorrect estimates for partners.

## Issues Found

### Issue 1: Wrong Carbon Credit Formula (Critical)

**Current (Incorrect):**
```typescript
const annualEnergy = systemSizeKWp * 1.6; // MWh
const creditsPerYear = Math.round(annualEnergy * 0.92);
```

**Correct Formula (from codebase):**
```typescript
const ANNUAL_GENERATION_FACTOR = 1642.50; // kWh per kWp per year
const EMISSION_FACTOR = 1.0334; // tCO₂e per MWh

const annualEnergyKWh = systemSizeKWp * ANNUAL_GENERATION_FACTOR;
const creditsPerYear = (annualEnergyKWh / 1000) * EMISSION_FACTOR;
```

**Example calculation for 100 kWp system:**
- Wrong: 100 × 1.6 × 0.92 = 147.2 credits/year
- Correct: 100 × 1642.50 / 1000 × 1.0334 = 169.74 credits/year

### Issue 2: Incorrect Revenue Calculation

**Current (Incorrect):**
Uses hardcoded average price of R148/credit.

**Correct Approach:**
Use actual year-by-year carbon prices from system settings:
- 2025: R97.34
- 2026: R127.03
- 2027: R143.12
- 2028: R158.79
- 2029: R174.88
- 2030: R190.55
- **6-Year Total: R891.71 per credit**

### Issue 3: Missing Database Fields

The proposal insert doesn't populate:
- `annual_energy` column
- `carbon_credits` column

### Issue 4: Query Structure Issues

The `handleListProposals` uses `.inner` join on `project_onboarding`, but project onboarding records are only created after signing - this would exclude all unsigned proposals from the list.

## Technical Implementation

### Step 1: Fix Carbon Calculation Constants

Add correct constants at the top of the edge function:
```typescript
const ANNUAL_GENERATION_FACTOR = 1642.50; // kWh per kWp per year
const EMISSION_FACTOR = 1.0334; // tCO₂e per MWh
const CARBON_PRICES = {
  '2025': 97.34,
  '2026': 127.03,
  '2027': 143.12,
  '2028': 158.79,
  '2029': 174.88,
  '2030': 190.55,
};
const SIX_YEAR_PRICE_SUM = 891.71; // Sum of all year prices
```

### Step 2: Fix handleCreateProposal Calculations

Update lines 366-393:
```typescript
// Calculate estimates using CORRECT formulas
const systemSizeKWp = data.project.system_size_kwp;
const annualEnergyKWh = systemSizeKWp * ANNUAL_GENERATION_FACTOR;
const creditsPerYear = (annualEnergyKWh / 1000) * EMISSION_FACTOR;

// Calculate 6-year revenue using actual prices
const revenue6yr = Math.round(
  creditsPerYear * SIX_YEAR_PRICE_SUM * (clientSharePercentage / 100)
);
```

### Step 3: Add Missing Fields to Proposal Insert

Update proposal insert to include:
```typescript
const proposalData = {
  // ... existing fields
  annual_energy: annualEnergyKWh,
  carbon_credits: creditsPerYear,
};
```

### Step 4: Fix List Proposals Query

Change from `.inner` join to `.left` join:
```typescript
// Before (wrong - excludes unsigned proposals):
project_onboarding!inner (id)

// After (correct - includes all proposals):
project_onboarding (id)
```

### Step 5: Add Test Partner for Verification

Create SQL to insert a test partner and API key for testing:
```sql
INSERT INTO partners (name, contact_email) 
VALUES ('Test Partner', 'test@example.com');

INSERT INTO partner_api_keys (partner_id, api_key_hash, api_key_prefix, environment, scopes)
VALUES (
  (SELECT id FROM partners WHERE name = 'Test Partner'),
  'sha256:test_hash_for_development',
  'cc_test_xxxx',
  'test',
  '["proposals:create", "proposals:read", "proposals:send", "projects:read", "projects:onboarding:write"]'
);
```

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/partner-api/index.ts` | Fix calculations, add constants, fix queries |

## Verification Steps

After fixes, test with these scenarios:

1. **Health Check**: `GET /v1/health` - Should return 200
2. **Create Proposal**: `POST /v1/proposals` - Verify correct calculations:
   - 100 kWp system should show ~169.74 credits/year
   - Revenue should use R891.71 per credit (6-year total)
3. **List Proposals**: `GET /v1/proposals` - Should return proposals even before signing
4. **Get Proposal**: `GET /v1/proposals/{id}` - Should return created proposal

## Expected Test Results (100 kWp system)

| Metric | Value |
|--------|-------|
| Annual Energy | 164,250 kWh |
| Carbon Credits | 169.74 tCO₂e/year |
| Client Share (0-5 MWp tier) | 60.2% |
| 6-Year Revenue | R91,056 |
