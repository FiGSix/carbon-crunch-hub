
# Dashboard Cards Review — `get_dashboard_metrics_by_stage`

The 3 stage pairs (Pending / Signed / Audit Ready) each show MWp + 2025-2030 Est. Revenue. The MWp sums look correct. The **revenue** SQL has 4 issues worth addressing.

## Issues found

### 1. Hardcoded carbon price `891.71` (drift risk)
SQL uses a baked constant for the sum of 2025-2030 prices:
```sql
v_carbon_price_6yr constant numeric := 891.71;
```
Meanwhile the rest of the app reads live prices from `system_settings.carbon_prices` (admin-editable). If an admin updates the prices, every proposal's stored revenue updates — but the dashboard cards stay frozen at 891.71. **Guaranteed to diverge.**

### 2. Misleading fallbacks `70` / `4`
```sql
COALESCE(client_share_percentage, 70)
COALESCE(agent_commission_percentage, 4)
```
We just removed the dead `DEFAULT_CLIENT_SHARE = 75` for exactly this reason. The real first-tier defaults are **60.20%** client share and **0% / 4% / 7%** agent commission depending on portfolio + presence of agent. In practice every proposal has these stored, so the fallback should never fire — but if it does, `70/4` overstates client revenue and understates Crunch's cut.

### 3. No commission-date pro-rating
The frontend `calculateRevenueByYearSync` (the source of truth used on every proposal) does two things the SQL ignores:
- Skips years **before** `commission_date`
- Pro-rates the commissioning year by remaining days

Effect: a project commissioned mid-2027 is shown on the dashboard with **full 2025+2026+half-2027** revenue it can never earn. Material overstatement for any project not commissioned by 1 Jan 2025.

### 4. "Vintage 2025" label vs. 6-year sum
Card title: **"Vintage 2025 Est. Revenue (2025-2030)"**. The parenthetical clarifies, but "Vintage 2025" technically refers to credits issued for the 2025 vintage year only. Not a bug, but worth confirming — should this card show 2025-only revenue, or keep the 6-year sum?

---

## Proposed adjustments

### A. Replace hardcoded price with live `system_settings.carbon_prices`
Read the JSON inside the function once, sum the relevant years. Keeps cards in sync with admin pricing.

### B. Remove the `70` / `4` fallbacks
Either drop COALESCE entirely (treat NULL as 0 — surfaces bad data instead of hiding it), or compute the same tiered defaults the app uses. Recommend the strict version since stored values should always exist.

### C. Add commission-date filter + pro-rate
Iterate years 2025-2030 in the function, skip pre-commission years, pro-rate commission year by remaining-days/365. Matches proposal page exactly.

### D. Confirm "Vintage 2025" semantics
Either rename to "Audit Ready Est. Revenue (2025-2030)" or change calc to 2025-only.

---

## Decision needed before implementing

1. Apply **A + B + C** as one migration? (Recommend yes — they're the real bugs.)
2. For **D**: rename card, change calc, or leave as-is?
3. Scope: this updates the SQL function only — no frontend changes other than possibly the card title for D.

## Out of scope
- The MWp sums (correct as-is)
- `audit_review_requests` count (correct)
- Frontend revenue calc (already canonical — this plan brings the dashboard to match it, not the other way around)
