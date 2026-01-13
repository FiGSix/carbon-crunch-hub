# Carbon Credit Calculations

**Last Updated:** January 2026  
**Location:** `src/services/calculations/carbon/`

---

## Table of Contents

1. [Overview](#overview)
2. [Calculation Pipeline](#calculation-pipeline)
3. [System Size Normalization](#system-size-normalization)
4. [Energy Production](#energy-production)
5. [Carbon Credits](#carbon-credits)
6. [Revenue Calculations](#revenue-calculations)
7. [Portfolio-Based Pricing](#portfolio-based-pricing)
8. [Agent Commission](#agent-commission)
9. [Multi-Phase Projects](#multi-phase-projects)
10. [API Reference](#api-reference)

---

## Overview

The carbon credit calculation system determines revenue share between clients, the platform, and agents based on solar PV system specifications. Key factors:

- **System Size** (kWp) - Solar installation capacity
- **Annual Energy** (kWh) - Expected yearly production
- **Carbon Credits** (tonnes CO2) - Credits generated
- **Carbon Price** (R/tonne) - Dynamic annual pricing
- **Client Share** (%) - Portfolio-based percentage
- **Agent Commission** (%) - Portfolio-based percentage

---

## Calculation Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    CALCULATION PIPELINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐                                            │
│  │ Input: System   │                                            │
│  │ Size (kWp/MWp)  │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ 1. Normalize to │ ◀── Validate & convert to kWp             │
│  │    kWp          │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ 2. Calculate    │ ◀── kWp × 1,600 kWh/kWp/year              │
│  │    Annual Energy│                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ 3. Calculate    │ ◀── kWh × 0.95 kg CO2/kWh ÷ 1000          │
│  │    Carbon Credits│                                           │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ 4. Get Carbon   │ ◀── Dynamic pricing per year              │
│  │    Price        │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ 5. Calculate    │ ◀── Credits × Price                       │
│  │    Gross Revenue│                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ 6. Apply Client │ ◀── Based on portfolio size               │
│  │    Share %      │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ 7. Apply Agent  │ ◀── Based on agent portfolio              │
│  │    Commission % │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ Output: Revenue │                                            │
│  │ Split Details   │                                            │
│  └─────────────────┘                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## System Size Normalization

### Supported Units

| Unit | Description | Conversion |
|------|-------------|------------|
| `kWp` | Kilowatt-peak | Base unit |
| `MWp` | Megawatt-peak | × 1,000 |
| `Wp` | Watt-peak | ÷ 1,000 |

### Normalization Function

```typescript
// Location: src/services/calculations/carbon/validation.ts

export function normalizeToKWp(size: number, unit: string = 'kwp'): number {
  const normalizedUnit = unit.toLowerCase().trim();
  
  switch (normalizedUnit) {
    case 'mwp':
    case 'mw':
      return size * 1000;
    case 'wp':
    case 'w':
      return size / 1000;
    case 'kwp':
    case 'kw':
    default:
      return size;
  }
}
```

### Validation

```typescript
export function validateSystemSize(sizeKWp: number): boolean {
  return sizeKWp > 0 && sizeKWp <= 1000000; // Max 1 GWp
}
```

---

## Energy Production

### Annual Energy Formula

```
Annual Energy (kWh) = System Size (kWp) × Yield Factor (kWh/kWp/year)
```

### Default Yield Factor

**1,600 kWh/kWp/year** - South African average for grid-connected solar PV

This accounts for:
- Solar irradiance levels
- System losses (inverter, wiring, soiling)
- Temperature effects
- Downtime

### Calculation

```typescript
// Location: src/services/calculations/carbon/calculations.ts

const YIELD_FACTOR_KWH_PER_KWP = 1600;

export function calculateAnnualEnergy(systemSizeKWp: number): number {
  return systemSizeKWp * YIELD_FACTOR_KWH_PER_KWP;
}
```

---

## Carbon Credits

### Carbon Credit Formula

```
Carbon Credits (tonnes) = Annual Energy (kWh) × Emission Factor (kg CO2/kWh) ÷ 1000
```

### Emission Factor

**0.95 kg CO2/kWh** - South African grid emission factor

This represents the CO2 emissions avoided by generating solar electricity instead of using grid power.

### Calculation

```typescript
const EMISSION_FACTOR_KG_CO2_PER_KWH = 0.95;

export function calculateCarbonCredits(annualEnergyKWh: number): number {
  return (annualEnergyKWh * EMISSION_FACTOR_KG_CO2_PER_KWH) / 1000;
}
```

### Example

For a 100 kWp system:
- Annual Energy: 100 × 1,600 = 160,000 kWh
- Carbon Credits: 160,000 × 0.95 ÷ 1000 = **152 tonnes CO2/year**

---

## Revenue Calculations

### Carbon Pricing

Dynamic pricing per year stored in `system_settings`:

```typescript
const DEFAULT_CARBON_PRICES: Record<number, number> = {
  2024: 450,
  2025: 475,
  2026: 500,
  2027: 525,
  2028: 550,
  2029: 575,
  2030: 600,
};
```

### Gross Revenue Formula

```
Gross Revenue = Carbon Credits × Carbon Price
```

### Revenue Split

```
Client Revenue = Gross Revenue × Client Share %
Platform Revenue = Gross Revenue - Client Revenue - Agent Commission
Agent Commission = Gross Revenue × Agent Commission %
```

### Calculation

```typescript
export function calculateRevenueByYear(
  carbonCredits: number,
  year: number,
  clientSharePercentage: number,
  agentCommissionPercentage: number
): RevenueBreakdown {
  const carbonPrice = getCarbonPriceForYear(year);
  const grossRevenue = carbonCredits * carbonPrice;
  
  const clientRevenue = grossRevenue * (clientSharePercentage / 100);
  const agentCommission = grossRevenue * (agentCommissionPercentage / 100);
  const platformRevenue = grossRevenue - clientRevenue - agentCommission;
  
  return {
    grossRevenue,
    clientRevenue,
    platformRevenue,
    agentCommission,
    carbonPrice,
    carbonCredits,
  };
}
```

---

## Portfolio-Based Pricing

### Client Share Tiers

Client share percentage is based on the **client's total portfolio size**:

| Portfolio Size (MWp) | Client Share % |
|---------------------|----------------|
| 0 - 5 | 60.20% |
| 5 - 10 | 63.00% |
| 10 - 20 | 66.50% |
| 20 - 30 | 68.25% |
| 30+ | 70.00% |

### Tier Lookup

```typescript
export const CLIENT_SHARE_TIERS = [
  { maxMWp: 5, sharePercentage: 60.20 },
  { maxMWp: 10, sharePercentage: 63.00 },
  { maxMWp: 20, sharePercentage: 66.50 },
  { maxMWp: 30, sharePercentage: 68.25 },
  { maxMWp: Infinity, sharePercentage: 70.00 },
];

export function getClientSharePercentage(portfolioMWp: number): number {
  for (const tier of CLIENT_SHARE_TIERS) {
    if (portfolioMWp <= tier.maxMWp) {
      return tier.sharePercentage;
    }
  }
  return CLIENT_SHARE_TIERS[CLIENT_SHARE_TIERS.length - 1].sharePercentage;
}
```

### Portfolio Calculation

A client's portfolio includes all **accepted** proposals:

```typescript
export async function calculateClientPortfolio(
  clientId: string
): Promise<number> {
  const { data } = await supabase
    .from('proposals')
    .select('system_size_kwp')
    .eq('client_reference_id', clientId)
    .eq('status', 'accepted');
  
  const totalKWp = data?.reduce((sum, p) => sum + (p.system_size_kwp || 0), 0) || 0;
  return totalKWp / 1000; // Convert to MWp
}
```

### Share Override

Clients can have a custom share percentage override:

```typescript
// In clients table
portfolio_client_share_override: number | null

// Usage
const sharePercentage = client.portfolio_client_share_override 
  || getClientSharePercentage(portfolioMWp);
```

---

## Agent Commission

### Commission Tiers

Agent commission is based on the **agent's total portfolio size**:

| Portfolio Size (MWp) | Commission % |
|---------------------|--------------|
| < 15 | 4% |
| >= 15 | 7% |

### Calculation

```typescript
export const AGENT_COMMISSION_TIERS = {
  THRESHOLD_MWP: 15,
  BELOW_THRESHOLD: 4,
  ABOVE_THRESHOLD: 7,
};

export function getAgentCommissionPercentage(portfolioMWp: number): number {
  return portfolioMWp >= AGENT_COMMISSION_TIERS.THRESHOLD_MWP
    ? AGENT_COMMISSION_TIERS.ABOVE_THRESHOLD
    : AGENT_COMMISSION_TIERS.BELOW_THRESHOLD;
}
```

### Commission Override

Agents can have a custom commission rate:

```typescript
// In profiles table
commission_override: number | null

// Usage
const commissionPercentage = agent.commission_override 
  || getAgentCommissionPercentage(agentPortfolioMWp);
```

---

## Multi-Phase Projects

Projects can have multiple commissioning phases with different dates:

```typescript
interface ProjectPhase {
  phaseNumber: number;
  systemSizeKWp: number;
  commissioningDate: Date;
}

// Revenue is calculated per phase with:
// - Pro-rated first year based on commissioning date
// - Full years thereafter
// - Dynamic carbon pricing per year
```

### Pro-Rated First Year

```typescript
export function calculateProRatedFirstYear(
  commissioningDate: Date,
  annualRevenue: number
): number {
  const monthsRemaining = 12 - commissioningDate.getMonth();
  return (annualRevenue * monthsRemaining) / 12;
}
```

---

## API Reference

### Main Service

```typescript
import { UnifiedCarbonService } from '@/services/calculations/carbon';

// Complete calculation
const result = await UnifiedCarbonService.calculateComplete({
  systemSizeKWp: 100,
  portfolioKWp: 5000,      // Client portfolio
  agentPortfolioKWp: 10000, // Agent portfolio
  years: 10,
});

// Result includes:
// - annualEnergy
// - carbonCredits
// - clientSharePercentage
// - agentCommissionPercentage
// - revenueByYear[]
// - totalRevenue
// - totalClientRevenue
// - totalAgentCommission
```

### Individual Functions

```typescript
// Normalize system size
normalizeToKWp(5, 'mwp'); // 5000

// Calculate energy
calculateAnnualEnergy(100); // 160000

// Calculate credits
calculateCarbonCredits(160000); // 152

// Get client share
getClientSharePercentage(5); // 60.20

// Get agent commission
getAgentCommissionPercentage(10); // 4

// Format currency
formatZAR(152000); // "R 152,000.00"
```

---

## Example Calculation

### Input
- System Size: 100 kWp
- Client Portfolio: 5 MWp (including this system)
- Agent Portfolio: 10 MWp
- Year: 2026

### Calculation Steps

```
1. Annual Energy = 100 × 1,600 = 160,000 kWh
2. Carbon Credits = 160,000 × 0.95 ÷ 1000 = 152 tonnes
3. Carbon Price (2026) = R 500/tonne
4. Gross Revenue = 152 × 500 = R 76,000
5. Client Share (0-5 MWp tier) = 60.20%
6. Agent Commission (< 15 MWp) = 4%

Revenue Split:
- Client: R 76,000 × 60.20% = R 45,752
- Agent: R 76,000 × 4% = R 3,040
- Platform: R 76,000 - R 45,752 - R 3,040 = R 27,208
```

---

## Configuration

### System Settings Keys

```sql
-- In system_settings table
INSERT INTO system_settings (setting_key, setting_value) VALUES
('carbon_price_schedule', '{"2024": 450, "2025": 475, ...}'),
('yield_factor_kwh_per_kwp', '1600'),
('emission_factor_kg_co2_per_kwh', '0.95'),
('client_share_tiers', '[{"maxMWp": 5, "sharePercentage": 60.20}, ...]'),
('agent_commission_tiers', '{"threshold": 15, "below": 4, "above": 7}');
```

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Data structure
- [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) - API endpoints
