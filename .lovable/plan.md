## Align Referral Landing Page Calculation with Platform Standard

Replace the referral page's hardcoded `1642.5 kWh/kWp` and flat `R1,250/tonne` math with the platform's canonical pipeline. The platform already has a single entry point that does everything we need.

### File touched
`src/pages/PartnerReferralLandingPage.tsx` — calculation block (lines ~20, 115–124) and the display block (lines ~420–438, 495–497).

No platform-side files are changed. No new services.

### What the page will now compute

Drop the local `useMemo` + constants and call the canonical pipeline:

```ts
import { calculateComplete } from "@/services/calculations/carbon/core";

const kwp = parseFloat(form.sizeKwp) || 0;
const result = await calculateComplete({
  sizeKwp: kwp,
  province: form.province,
  commissionDate: new Date().toISOString(),
});
```

`result` provides:
- `result.annualEnergyKwh` — province-specific yield × kWp
- `result.carbonCreditsPerYear` — tCO₂/yr
- `result.clientSharePercentage` — from the tier table (e.g. 60.20% for systems < 5 MWp)
- `result.clientRevenuePerYear` — current-year rand value after client share
- `result.revenueByYear` — full vintage breakdown (one entry per vintage year through programme end)

### UI changes (Step 2 reveal)

Keep the existing layout exactly as-is:

- Big headline number switches from gross `tCO₂ × R1,250` to the **client's actual current-year earnings** (`result.clientRevenuePerYear`), labelled "You could earn approximately".
- The two stat tiles stay (tonnes CO₂/yr and MWh clean energy/yr), now driven by `result`.
- No extra copy, no programme lifetime total, no client share disclosure line.

The amber "conservative estimate" disclaimer and the eligibility list are left untouched.

The success-screen recap (line 497) reuses `result.carbonCreditsPerYear` and `result.clientRevenuePerYear`.

### Async handling

`calculateComplete` is async (yield + vintage prices come from Supabase with cache). Convert `carbonProjection` from `useMemo` to a `useState` populated by a `useEffect` keyed on `[form.sizeKwp, form.province]`, with a lightweight loading state in the Step 2 figures (small spinner where the number renders). Defaults to zero while loading. Errors fall back to the platform's own fallbacks (1642.5 yield, `CARBON_PRICES` constants) — already handled inside `calculateComplete`.

### Decisions baked in (matching the explore findings)

- **Commission date**: defaults to "today". The referral form doesn't ask for it, and that matches how the proposal pipeline behaves for new installs.
- **Property type**: not used in calc anywhere in the platform — left as form metadata only.
- **Client share**: comes from the tiered function; no override (proposal-level overrides apply only after a proposal exists).

### Out of scope

- The proposal created by `create-referral-proposal` (edge function) already runs the platform calc server-side, so no edge-function change is needed.
- No changes to `CARBON_PRICES`, `regional_solar_yields`, `getClientSharePercentage`, or any other shared module.