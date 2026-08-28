# Reconcile revenue: dashboard landing vs Vintage & Revenue table

The two surfaces disagree because they use different engines. The dashboard cards come from the Postgres function `get_dashboard_metrics_by_stage`; the Vintage & Revenue table comes from the client-side hook `useAdminRevenueYearlyTable`. Below is what I verified against the live database and the code, then what to change.

## What each surface actually computes today (verified)

| | Dashboard landing cards | Revenue year-by-year table |
|---|---|---|
| Source | DB function, live prices from `system_settings.carbon_prices` | Hook, hard-coded `CARBON_PRICES` constant |
| Prices | 2025-2030 | Identical values today (checked) |
| Years | 2025-2030 only | Blend (2024 price) + 2025-2030 + 2031-2037 est. |
| Amount shown to admin | **Crunch/platform share only** (100 - client% - agent%) | Total revenue plus each split column |
| Commission-date pro-rating | Yes (skips pre-commissioning years, pro-rates first year) | No |
| Archived proposals | Excluded (`archived_at is null`) | Not excluded (currently 0 rows, so no live impact) |
| Super Partner share | Not deducted | Deducted from Crunch Carbon |
| Audit Ready | audit_ready **and signed** | audit_ready only (signature ignored) |
| Signed | `signed_at` not null | `signed_at` not null **or** status `signed` |
| Pipeline | unsigned **and** status in draft/sent/delivered/opened/viewed/stale | any unsigned proposal |

Measured impact on the Audit Ready set (120 projects either way):

- Gross 2025-2030: R59.08m (table, flat) vs R58.37m (pro-rated) — pro-rating removes ~R0.71m.
- Crunch/platform share 2025-2030: R20.59m flat vs R20.34m pro-rated — this R20.3m is the number on the landing card, and it is not comparable to the table's R59m "Total revenue" column.
- Signed scope matches exactly (202 both ways; no rows with status `signed` but no `signed_at`).
- Pipeline differs by 6 proposals (statuses outside the RPC's allow-list, e.g. approved/bounced).
- No archived proposals exist right now, so that filter changes nothing today but will diverge later.

So the headline: the numbers are not wrong so much as measuring different things — share vs total, pro-rated vs flat, signed-gated vs not.

## Client-specific rate sets are NOT applied on either surface (verified)

There are two rate sets: `Default` and `Large Clients` (about 6.7% higher, e.g. 2030 at R203.29 vs R190.55). Two clients are on `Large Clients`:

- Dipula Income Fund Limited (Clayton McLean) — 25 proposals, 1 audit ready across the pair
- MPower (Pty) Ltd (Hilton Hunkin) — 3 proposals

Together 28 proposals, ~59,628 credits. Priced 2025-2030 that is R53.17m on default rates vs R56.72m on their real rates — a ~R3.55m understatement once those projects flow through, of which only the audit-ready one is currently visible in the Audit Ready figures.

Neither surface uses the rate set: the dashboard function reads only `system_settings.carbon_prices`, and the yearly table uses the hard-coded `CARBON_PRICES` constant. Only the onboarding CSV export honours per-client rate sets today.


## Changes

1. **Make the table's scopes match the funnel definitions** in `useAdminRevenueYearlyTable.ts`:
   - Audit Ready = `audit_ready = true` AND signed.
   - Pipeline = unsigned AND status in the same allow-list the RPC uses.
   - Exclude `archived_at is not null` (add to the query alongside `deleted_at`).
2. **Apply commission-date pro-rating in the table**, using the same rule as the RPC (0 before the commissioning year, day-count pro-rata in the commissioning year). Requires selecting `content->projectInfo->commissionDate` and reusing the existing pro-rating helper rather than writing new maths.
3. **Use live prices, not the constant** — read `carbon_prices` from `system_settings` (via the existing pricing service) so an admin price edit moves both surfaces. Keep the 2031-2037 estimate as 5% p.a. on the live 2030 rate.
3a. **Honour per-client rate sets on both surfaces** — resolve each proposal's client rate set (`clients.carbon_rate_set_id` -> `carbon_rate_sets.prices`, falling back to the default set) and price that proposal's years with it. In the table this means a price map per proposal instead of one map per row (the "SA price (R/t)" column then shows the default rate with a note that some projects price higher); in the RPC it means joining the rate set instead of reading `system_settings` alone. Estimated 2031-2037 years escalate 5% p.a. off each proposal's own 2030 rate.

4. **Deduct Super Partner in the RPC too**, so "Crunch Carbon" means the same thing on both screens; the RPC's admin branch currently leaves SP inside the platform share.
5. **Label the landing card honestly**: the admin "Audit Ready value" and funnel hover figures are the Crunch Carbon share, not total project revenue. Change the wording to "Crunch Carbon share, est. 2025-2030" (client and agent roles already see their own share, so their labels stay).
6. **Add a note under the table** stating it shows total contract value with splits and includes Blend and estimated years, so the grand total is expected to exceed the landing card.

## Technical notes

- Files: `src/hooks/dashboard/useAdminRevenueYearlyTable.ts`, `src/pages/Dashboard.tsx` (labels), `src/components/dashboard/sections/RevenueYearlyBreakdown.tsx` (footnote), plus one migration to update `get_dashboard_metrics_by_stage` for the SP deduction.
- No new calculation engine: pro-rating mirrors the RPC's existing expression; prices come from the existing dynamic pricing service.
- Verification after the change: for the Audit Ready scope, the table's Crunch Carbon subtotal for 2025-2030 (excluding Blend) must equal the landing card's Audit Ready value to the rand; repeat the same check for Signed and Pipeline against the corresponding funnel stages.
