## Goal
Make the referral landing page show a **full-year** earnings estimate instead of a partial-year amount based on today's commission date.

## Problem
Currently `PartnerReferralLandingPage` passes `commissionDate: new Date().toISOString()` to `calculateComplete()`. The platform's revenue engine then pro-rates the first vintage year from the commission date to year-end, so a system "commissioned today" only earns a fraction of a full year's revenue in the headline figure (`clientRevenuePerYear` = current-year bucket from `revenueByYear`).

That makes the headline R/year look artificially low and inconsistent with how prospects intuitively read "per year".

## Change
In `src/pages/PartnerReferralLandingPage.tsx`, set the commission date to **1 January of the current year** so the first vintage bucket represents a full 12 months at the current vintage price.

```ts
const commissionDate = new Date(new Date().getFullYear(), 0, 1).toISOString();
```

Everything else (province yield, emission factor, client share tier, current vintage price) keeps flowing through `calculateComplete()` unchanged. The two stat tiles (tCO₂/yr, MWh/yr) are already annualised and remain correct.

## Out of scope
- No change to `calculateComplete`, `calculateRevenueByYear`, `CARBON_PRICES`, or any shared service.
- No change to the `create-referral-proposal` edge function (proposal projections there are separate from the landing-page headline; can be revisited in a follow-up if you want them aligned too).
- No UI/layout changes — same headline + two tiles.
