## Why R 50,798,903 is still wrong for 18 MWp signed projects

### Sanity-check math
Standard formula: `kWp × 1642.5 × 1.0334 / 1000 = ~1.697 tonnes/kWp/year`.

For 18.25 MWp (the actual signed/non-audit-ready total) you should see roughly:
- ~30,973 tonnes CO₂ / year
- × ~R140/t average (2025–2030 prices: 97 → 191) × 6 years ≈ **R 26M gross**
- × admin platform share (~35.8%) ≈ **R 9–10M** for the "Signed Projects Est. Revenue (2025–2030)" card

### What's actually in the database
Sum of stored `carbon_credits` for the 18.25 MWp of signed-but-not-audit-ready proposals = **153,887 tonnes/year**, ~5× higher than physically possible. That inflation is what produces R 50.8M.

### Where the inflation is concentrated
Bucketed by `carbon_credits / system_size_kwp` ratio (correct value ≈ 1.697):

| Bucket | Rows | Sum credits | Notes |
|---|---|---|---|
| ~1.7 (correct) | 60 | 23,653 | OK |
| ~0.95 | 8 | 3,368 | Slightly under-stated, minor effect |
| **>100× corrupt** | **4** | **126,850** | Drives ~82% of the card |
| other | 2 | 16 | Negligible |

### The 4 corrupt records
All four share an identical broken ratio of **2787.913 credits per kWp** (≈ 1642.5 × 1.697 — formula applied twice / yield factor multiplied where it should have been divided):

| ID | kWp | Stored credits | Should be | Commission | Signed |
|---|---|---|---|---|---|
| b49bf320…85e64de8a8d | 21 | 58,546.17 | 35.64 | 2026-01-01 | 2026-03-05 |
| 075adcea…435822679 | 8.8 | 24,533.63 | 14.94 | 2023-07-17 | 2026-05-07 |
| 0a0f26c5…2fe76707c | 8.0 | 22,303.30 | 13.58 | 2025-04-14 | 2026-03-16 |
| 5dead156…1889a1901ab | 7.7 | 21,466.93 | 13.07 | 2024-01-19 | 2026-04-17 |

All four were created Mar–May 2026 and signed shortly after, so they came through a recent code path (not legacy import) — same defect produced all four. Worth investigating where in the create-proposal flow `carbon_credits` is being calculated/saved for these tiny systems.

### Proposed fix (this turn)

1. **Recompute `carbon_credits` for the 4 corrupt records** using the same standard formula (`kWp × 1642.5 × 1.0334 / 1000`). One UPDATE.
2. **Re-check the dashboard card.** Expected new value ≈ **R 9–11M** for Signed Projects Est. Revenue (2025–2030) at admin scope (or ~R 18–20M client-share, ~R 1–2M agent-commission, depending on viewer role).

### Out of scope (call out, don't fix here)

- The 8 records in the ~0.95 bucket — minor (~3,368 t total), probably an older/regional yield assumption. Confirm before touching.
- The **root cause in the proposal-creation code** that produced 5 corrupt records (Boland Superspar already fixed + these 4). Recommend a follow-up to (a) find the buggy calculation site and (b) add a DB sanity guard (e.g. trigger flagging `carbon_credits / system_size_kwp` outside 0.5–3.0).
- No backfill of missing `commission_date` (only the Boland record has it null among the inflated ones now).

Approve and I'll run the UPDATE and re-verify the card.
