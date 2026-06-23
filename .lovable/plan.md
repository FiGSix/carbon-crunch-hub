## Goal

Let users choose, per project (or per phase), how the system's energy generation is sourced for carbon-credit calculations:

- **Mode A — System Size (kWp)** (default, current behaviour): platform multiplies kWp × yield factor to estimate annual kWh.
- **Mode B — Estimated kWh per year**: user enters actual/estimated generation for each vintage year 2025, 2026, 2027, 2028, 2029, 2030. Platform uses those numbers as-is, no pro-rating.

Available in Admin/Partner **Create Proposal** and the **Client Submit Project** flow. Supported for both single-phase and multi-phase projects (multi-phase: each phase gets its own 6-year grid).

---

## UX

In the Project Information step, add a segmented toggle at the top of the size section:

```
Generation input method:  [ System Size (kWp) ]  [ Estimated kWh per year ]
```

**kWp mode** — unchanged from today (size + commission date, or per-phase size + date for multi-phase).

**kWh mode (single-phase)** — replace the size field with a 6-row grid:

```
Estimated annual generation (kWh)
  2025  [__________]
  2026  [__________]
  2027  [__________]
  2028  [__________]
  2029  [__________]
  2030  [__________]
```

Commission date remains required (used for vintage/eligibility, not pro-rating).

**kWh mode (multi-phase)** — each phase card shows its own 2025–2030 grid plus its commission date. Project total kWh per year = sum across phases.

Validation:
- At least one year > 0.
- Each entry numeric, ≥ 0, ≤ 50 GWh sanity cap.
- "Use entered values as-is — no pro-rating" helper text under the grid.

Summary step shows a clear badge: *"Generation source: User-supplied kWh"* vs *"Generation source: Calculated from kWp"* so admins can tell them apart at review.

---

## Calculation logic

Carbon credits per year = `annualKwh / 1000 × emissionFactor` (existing formula, just sourced differently).

- **kWp mode**: `annualKwh = sizeKwp × yieldFactor` (existing path, untouched).
- **kWh mode**: `annualKwh[year] = userInput[year]` directly.

Revenue per year = `credits[year] × carbonPrice[year] × sharePercent` — same pipeline, only the per-year kWh source changes.

System-size displays (e.g. portfolio MWp totals) for kWh-mode projects: store a `derived_system_size_kwp` back-calculated from the highest annual kWh ÷ yieldFactor so dashboards keep working, flagged as derived.

---

## Technical notes

**Types (`src/types/proposals.ts`)** — extend `ProjectInformation` and `ProjectPhase`:
```
generationInputMode: 'kwp' | 'kwh'   // default 'kwp'
annualKwhByYear?: { '2025': number; ... '2030': number }
```

**Form layer**
- New `GenerationInputToggle` + `AnnualKwhGrid` components under `src/components/proposals/project-info/`.
- `ProjectInfoStep.tsx` validation extended for kWh mode (single + multi-phase).
- Wire through `CreateProposal.tsx` and `SubmitProject.tsx` (no behavioural change when mode = 'kwp').

**Calculation layer (`src/services/calculations/carbon/`)**
- `SystemSpecs` gains optional `annualKwhByYear` and `phases[].annualKwhByYear`.
- `core.ts` / `calculations.ts`: when `annualKwhByYear` present, skip yield-factor step and feed those numbers straight into the per-year credit/revenue loop.
- `portfolio.ts`: aggregate using derived kWp for kWh-mode projects.

**Persistence**
- Store the two new fields inside the existing `proposals.content` JSON (no schema migration needed — `content` is already untyped JSON used for project info).
- Edge functions that recompute revenue (`accept-proposal`, any nightly recalc) read `content.generationInputMode` and branch identically.

**PDF / summary / acceptance page**
- `proposalPdfTemplate.ts` and the acceptance ProjectDetailsStep render the per-year kWh grid read-only when mode = 'kwh'.
- Email summary numbers unchanged in structure — only the source label differs.

**Backwards compatibility**
- Missing `generationInputMode` → treat as `'kwp'`. Every existing proposal keeps working unchanged.

---

## Out of scope

- Importing kWh from inverter portals (separate feature).
- Editing generation mode after a proposal is signed.
- Changing emission factor, carbon prices, or share percentages.
