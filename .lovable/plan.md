
## Goal

Allow admins/partners to fully edit a proposal after creation — including switching between kWp and multi-year kWh input, and editing per-phase kWh grids for multi-phase projects. Today the Edit Proposal dialog only edits kWp (single + per-phase) and ignores `generationInputMode`/`annualKwhByYear`, so kWh-mode proposals can't be corrected after creation.

## Scope

In scope:
- `ProposalEditDialog` UI: mode toggle + AnnualKwhGrid (single-phase) + per-phase AnnualKwhGrid (multi-phase).
- `useProposalEdit` hook: load, edit, validate, and persist `generationInputMode` and `annualKwhByYear` (single + per-phase) into `proposals.content.projectInfo` and recompute summary fields.

Out of scope:
- Editing eligibility criteria, status, signed proposals, GPS / address-source metadata, phase add/remove (size of phase array stays as-is).
- Changes to creation flows, summary rendering, or calc engine.

## UX

In the "Project Information" block of the Edit dialog:

1. Add a small "Generation input" segmented toggle: **kWp** | **Annual kWh**. Defaults to whatever the saved proposal uses (`projectInfo.generationInputMode ?? 'kwp'`).
2. When **kWp** is selected: keep the existing System Size + Commission Date fields (single-phase) or existing per-phase size+date rows (multi-phase).
3. When **Annual kWh** is selected:
   - Single-phase: show Commission Date + reuse `AnnualKwhGrid` for years 2025–2030. Hide System Size input.
   - Multi-phase: under each phase card, replace the Size (kWp) field with an `AnnualKwhGrid` bound to that phase's `annualKwhByYear`. Keep per-phase Commission Date and phase name as-is.
4. Save button stays disabled until validation passes (see below).

No changes to client info, additional clients, address, or notes sections.

## Validation

- kWp mode: existing rules unchanged.
- kWh mode, single-phase: require commission date and at least one year with a value > 0.
- kWh mode, multi-phase: each phase requires a commission date and at least one year > 0.
- Re-use the 50 GWh/year cap already enforced by `AnnualKwhGrid`.

## Persistence

In `useProposalEdit.save`:

- Write `projectInfo.generationInputMode` (`'kwp' | 'kwh'`).
- In kWh mode:
  - Single-phase: store `projectInfo.annualKwhByYear`, clear `size`, set `totalSystemSize` to `undefined`.
  - Multi-phase: store each phase's `annualKwhByYear`, leave `sizeKWp` as the existing saved value (don't overwrite kWp data so users can switch back).
- In kWp mode: clear `annualKwhByYear` on project and phases (don't drop kWp values).
- Recompute `annual_energy` and `carbon_credits` columns:
  - kWp mode: keep current `calculateAnnualEnergy` / `calculateCarbonCredits` based on size.
  - kWh mode: sum the entered yearly kWh / 6 for `annual_energy`, then apply `EMISSION_FACTOR / 1000` for `carbon_credits` (matches `unifiedProposalService` behaviour for new kWh proposals).
- Keep `system_size_kwp` untouched in kWh mode (the proposal model stores 0 or a derived value already).
- Single atomic `proposals.update` (existing pattern).

Audit columns (`client_share_override_*`) and the additional-clients sync code are untouched.

## Technical notes

Files to edit:

- `src/hooks/proposals/view/useProposalEdit.ts`
  - Extend `ProposalEditFormData` with `generationInputMode`, `annualKwhByYear`, and `PhaseFormData.annualKwhByYear`.
  - Update `extractFormData`, `extractPhases`, `validate`, and `save` per above.
  - Add `updateMode(next)`, `updateAnnualKwh(next)`, `updatePhaseAnnualKwh(index, next)` setters.

- `src/components/proposals/view/ProposalEditDialog.tsx`
  - Add mode toggle (use existing shadcn `Tabs` or `ToggleGroup`).
  - Conditionally render kWp vs kWh inputs (single + per-phase) using `AnnualKwhGrid`.

No DB migrations, no service-layer changes, no new dependencies.

## Verification

- Edit a kWp single-phase proposal — toggle to kWh, fill 2 years, save, reopen → values persist, summary shows kWh-derived energy/credits.
- Edit a kWh multi-phase proposal — change one phase's 2026 kWh, save, reopen → only that phase changed.
- Toggle kWh → kWp on an existing kWp proposal, save → kWp value and computed energy/credits unchanged.
- Validation: clearing all years in kWh mode blocks save with field-level error.
