## Fix corrupt carbon_credits value

### Target
Proposal `5f9866e9-2b27-429a-895b-9dba1c43c589` ("Philip Jankielsohn - Boland Superspar")

### Current (bad) value
- `system_size_kwp`: 489
- `carbon_credits`: 1,363,289.45 (off by ~1,640× — likely stored annual kWh × emission factor without the ÷1000 conversion to tonnes)

### Standard formula
```
annual_energy_kwh   = system_size_kwp × 1642.50
carbon_credits_tCO2 = annual_energy_kwh × 1.0334 / 1000
```

### Recomputed value
```
489 × 1642.50 × 1.0334 / 1000 ≈ 829.91 tonnes CO₂/year
```

### Change
Single SQL UPDATE on `proposals`:
```sql
UPDATE public.proposals
SET carbon_credits = 489 * 1642.50 * 1.0334 / 1000
WHERE id = '5f9866e9-2b27-429a-895b-9dba1c43c589';
```
(executed via the data-insert/update tool, not a schema migration)

### Verification
1. Re-query the row to confirm `carbon_credits ≈ 829.91`.
2. Reload the dashboard "Signed Projects" card — expected drop from R 534M to roughly R 50–55M total.

### Out of scope (explicitly not done here)
- No recompute of `total_client_revenue` / agent commission columns on the row (the dashboard derives revenue from `carbon_credits` live; if there are denormalised revenue columns we should also refresh, confirm before doing so).
- No bulk audit of other suspicious rows.
- No CHECK constraint / trigger guardrail.
- No backfill of missing `commission_date`.

Tell me to proceed and I'll run the update, then re-check the dashboard figure.
