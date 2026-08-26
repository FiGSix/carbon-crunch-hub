# Vintage & Revenue: Year-by-Year Breakdown Table (Admin)

Add a full-width "Revenue year-by-year breakdown" table to the top of the Vintage & Revenue page (`/vintage-revenue`), styled on the attached reference screenshot, with a status-scope dropdown. Admin-only (it exposes Partner, Super Partner and Crunch Carbon splits).

## Table layout

Columns:

```text
Year | SA price (R/t) | CO2 (tonnes) | Total revenue | Client | Partner | Super Partner | Crunch Carbon
```

Rows:
- **Blend (2022-2024)** — green pill, uses 2024 price (R78.36), only projects signed on/before 2024-12-31 (same rule as existing hooks).
- **2025-2030** — existing `CARBON_PRICES` rates (97.34 / 127.03 / 143.12 / 158.79 / 174.88 / 190.55).
- **Subtotal: Blend-2030**.
- **2031-2037** — estimated rates, 5% p.a. escalation on the 2030 rate, rows marked with an "EST" badge and shown muted (per the screenshot's convention).
- **Subtotal: 2031-2037 (est.)**.
- **Grand total** row at the bottom.

## Scope dropdown

A select above the table: **Pipeline | Signed | Audit Ready | Signed + Audit Ready | Pipeline + Signed + Audit Ready** (default: Audit Ready, matching the existing "Audit Ready Projects Est. Revenue" card).

- Pipeline = proposals not yet signed (status draft/sent/delivered/approved/bounced, `signed_at` null), `deleted_at` null.
- Signed = `signed_at` not null / status signed.
- Audit Ready = `project_onboarding.audit_ready = true`.
- Combos are unions of the above sets.

## Calculation (reuses existing logic, nothing new invented)

Per proposal, per year — identical formula to `useAdminVintageRevenueBreakdown`:
- `total = carbon_credits * price[year]`
- Client = `total * client_share_percentage/100`
- Partner = `total * agent_commission_percentage/100`
- Super Partner = `total * sp_rate/100`, where `sp_rate` comes from `super_partner_commissions.commission_rate` for that proposal (0 when no SP is linked).
- Crunch Carbon = remainder (`total - client - partner - sp`).
- CO2 column = sum of `carbon_credits` of in-scope proposals (constant across years, as in the screenshot).

## Implementation

1. **New hook** `src/hooks/dashboard/useAdminRevenueYearlyTable.ts`
   - One query: proposals (`carbon_credits`, `client_share_percentage`, `agent_commission_percentage`, `signed_at`, `status`, `deleted_at`, `project_onboarding(audit_ready)`).
   - One query: `super_partner_commissions` (`proposal_id`, `commission_rate`) mapped by proposal.
   - Aggregates per year for the selected scope; returns blend row, year rows, and the three totals rows. Admin-gated like the existing admin hook.
2. **New component** `src/components/dashboard/sections/RevenueYearlyBreakdown.tsx`
   - Card with title "Revenue year-by-year breakdown", scope `Select`, and a `Table` with the columns above; EST badge + muted styling for 2031-2037; sticky-style totals rows; `en-ZA` ZAR formatting (same formatter as existing cards).
3. **Wire into `src/pages/VintageInsights.tsx`** — render at the top, full width, above the existing 2x2 grids. Wrapped in `userRole === 'admin'` so agents/clients/super partners never see partner/platform splits.

## Notes / assumptions

- Existing `VintageRevenueBreakdown` card stays as-is (it becomes the compact summary; the new table is the detailed view).
- 5% p.a. escalation for 2031-2037 matches the reference screenshot's stated assumption; flagged as estimates in the UI.
- Super Partner share is taken out of the platform side, so Crunch Carbon = remainder after client, partner and SP.
- No database changes, no new calculation engine — same `CARBON_PRICES` constants and split math already used by the existing vintage hooks.

## Verification

- Typecheck + build OK.
- Browser check as admin on `/vintage-revenue`: table renders, dropdown switches scope and totals move sensibly (Audit Ready <= Signed <= all), Blend row shows only pre-2025 signings, EST rows muted, grand total = sum of both subtotals.
