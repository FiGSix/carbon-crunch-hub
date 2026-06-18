## Goal
Hide client/proposal-level detail from super partners in the Commission section. Show rolled-up totals per company (the agent's `profiles.company_name`).

## Changes

### 1. New SQL function: `get_super_partner_commission_by_company()`
SECURITY DEFINER, callable by admin or super partner (same gate as the existing ledger). Aggregates `super_partner_commissions` joined to `proposals` (for MWp) and `profiles` (for the agent's company).

Returns one row per company:

- `company` (text — `COALESCE(NULLIF(ag.company_name,''), '—')`)
- `mwp` (numeric — `SUM(pr.system_size_kwp) / 1000`)
- `rate` (numeric — the **super partner's current tier rate**, i.e. `profiles.super_partner_commission_rate` for the caller; same value on every row)
- `amount` (numeric — `SUM(spc.commission_amount)`)

Filter: `WHERE v_is_admin OR spc.super_partner_id = v_caller`. Group by `ag.company_name`. Order by `company`.

### 2. Update `src/pages/SuperPartnerCommission.tsx`
Replace the per-proposal table with a per-company table:

| Company | MWp | Rate | Amount |

- Call the new RPC instead of `get_super_partner_commission_ledger`.
- Remove Proposal / Client / Agent / Signed / Status columns — they expose linked partners' client details.
- Format MWp to 2 decimals, rate to 2 decimals with `%`, amount as ZAR.

### 3. Leave untouched
- `get_super_partner_commission_ledger` stays (admin still uses it elsewhere if needed).
- No RLS / schema changes on `super_partner_commissions`.
- Admin commission views unchanged.
