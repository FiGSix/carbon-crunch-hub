# Make the PDF reflect kWh mode, multi-phase, and post-edit changes

## Problem

The PDF generator (`supabase/functions/generate-proposal-pdf/index.ts`) was written before kWh mode and multi-phase support, and still reads from columns and shapes that don't reflect the new edit flow:

- **Page 3 "Project Schedule" table** builds a single row from `proposal.system_size_kwp` + `content.projectInfo.address` + `content.projectInfo.commissionDate`. It never iterates `projectInfo.phases`, and has no concept of kWh-mode input.
- **Page 4 "Revenue Share" table** recomputes every year as `system_size_kwp × 1642.5 kWh/kWp × emission factor`. It ignores `annualKwhByYear`, ignores per-phase data, and ignores `generationInputMode`.
- **Edit save (`useProposalEdit.ts`)** intentionally does NOT overwrite `system_size_kwp` when saving in kWh mode (to avoid lying about kWp). Result: after a kWh edit the PDF still renders the *old* kWp and ignores the new annual-kWh grid the user just entered.

So the live app shows the updated kWh-based numbers (after the previous fix), but a freshly regenerated PDF silently falls back to the original kWp and looks stale/incorrect.

## Goal

The PDF must render exactly what the proposal view renders, for every supported combination:
- kWp single-phase
- kWp multi-phase
- kWh single-phase (per-year overrides)
- kWh multi-phase (per-phase per-year overrides)

…both on initial creation **and** after any edit via the Edit Proposal dialog.

## Plan

### 1. Centralise generation/credit math in the edge function

In `supabase/functions/generate-proposal-pdf/index.ts`, add a small helper block near the top of `generatePdfContent` that derives, from `proposal.content.projectInfo`:

- `mode`: `'kwp' | 'kwh'` (default `'kwp'`)
- `phases[]`: normalised list of `{ name, sizeKWp, commissionDate, annualKwhByYear }` — single-phase wraps the top-level values into one synthetic phase
- `kwhForYear(year)`: returns total kWh across all phases for a given calendar year
  - kWh mode: sum each phase's `annualKwhByYear[year]` (0 if absent)
  - kWp mode: sum each phase's `sizeKWp × 1642.5`, with the existing pro-rating rule applied per phase using that phase's own `commissionDate`
- `totalKwpForSchedule()`: sum of phase `sizeKWp` (kWp mode) or `null` in kWh mode

This becomes the single source of truth for both the schedule table and the revenue table.

### 2. Page 3 — Project Schedule table

Drive rows from the normalised `phases[]`:

- One row per phase. Columns stay `Project Address | Commissioning Date | Project Size`.
- In **kWp mode** the size column shows `<sizeKWp> kWp` (current behaviour, per phase).
- In **kWh mode** the size column shows the total kWh for that phase across all configured years (e.g. `1,234,567 kWh total`), since kWp is not meaningful.
- TOTAL row: sum of kWp in kWp mode; sum of kWh in kWh mode; header label of the size column stays generic enough to cover both.
- Address falls back to the proposal-level address when a phase has none.

### 3. Page 4 — Revenue Share table

Replace the current `systemSizeKWp`-only loop with a per-year loop that calls `kwhForYear(year)`:

- `MWh Generated = kwhForYear(year) / 1000`
- `tCO₂e Offset = (kwhForYear(year) / 1000) × EMISSION_FACTOR`
- Client price / revenue logic is unchanged.
- Pro-rating for commission year only applies in kWp mode (kWh values are already user-supplied final numbers).

This makes the table match `RevenueDistributionSection` in the UI exactly, including post-edit overrides.

### 4. `useProposalEdit.save` — keep top-level row fields aligned

Currently the save:
- Updates `content.projectInfo` correctly.
- Updates `annual_energy` and `carbon_credits`.
- Skips `system_size_kwp` in kWh mode.

Add, in kWh mode only, an additional update to `project_info.size` and `project_info.commission_date` so the legacy denormalised column the PDF reads from page 3 fallback paths is cleared/blank rather than stale. We do **not** invent a fake kWp from kWh — page 3 will display kWh totals from `content` instead.

Also bump `updated_at` (already done) so the PDF cache check in `generate-proposal-pdf` (`pdfAge < proposalAge`) correctly invalidates the existing PDF on next download.

### 5. Force PDF refresh after a successful edit

In `useProposalEdit.save`, after the proposal row update succeeds, fire a non-blocking `supabase.functions.invoke('generate-proposal-pdf', { body: { proposalId, forceRegenerate: true } })`. We don't await it for UX, but it guarantees the cached PDF in storage is regenerated immediately so the next download — including agent share links — reflects the edit without requiring the user to click "Regenerate & Download".

## Out of scope

- Frontend proposal view (already handles kWh / multi-phase after the prior fix).
- Proposal creation flow, summary step, calculation engine, DB schema.
- Page 1/2 cover and projections pages — they already use `carbon_credits` / share % from the row, which the edit now updates correctly.

## Technical notes

- All edits are in two files: `supabase/functions/generate-proposal-pdf/index.ts` and `src/hooks/proposals/view/useProposalEdit.ts`. No new tables, no new dependencies.
- Edge function will be auto-deployed by Lovable; no manual deploy needed.
- Pro-rating constants (`ANNUAL_GENERATION_FACTOR = 1642.5`, `EMISSION_FACTOR = 1.0334`) stay where they are.
