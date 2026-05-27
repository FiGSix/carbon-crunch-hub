## Goal
Keep only the active "Abendruhe Plaas" proposal and the Robert Blake client tied to it. Permanently remove the older duplicate proposal and the older duplicate client.

## Keep
- **Client** `6104faa8…` — Robert Blake, `abendruhe.robert@outlook.com`, company "Abendruhe Plaas"
- **Proposal** `6e9a34e3…` — "Abendruhe Plaas", 159.8 kWp, delivered 26 May, viewed 27 May

## Remove (permanent)
- **Proposal** `d6493bc9…` — "Abendruhe Farm Wellington", 157 kWp (Nov 2025)
- **Client** `878c9f68…` — "R. Blake", `robert@blakefruit.co.za`
- The orphaned FK target `eb64e6aa…` (already gone from `clients`)

## Steps

1. **Tidy the surviving client** `6104faa8…`:
   - `first_name = 'Robert'`, `company_name = 'Abendruhe Plaas'` (fix casing).
2. **Link the surviving proposal** `6e9a34e3…` to client `6104faa8…` (currently `client_id = NULL`).
3. **Hard-delete the old proposal** `d6493bc9…` and its dependent rows (verified counts):
   - `email_events` (11 rows) — delete
   - `proposal_automation_log` (12 rows) — delete
   - `proposal_engagement_buckets` (1 row) — delete
   - Then delete the proposal row itself.
   - Also remove its PDF from storage (`proposal-pdfs/proposal-d6493bc9-…-v2.pdf`).
4. **Hard-delete the old client** `878c9f68…` — verified zero references in `proposals`, `proposal_clients`, `leads`, `portfolio_reminder_candidates`, `proposal_engagement_buckets`.

## Confirmation
This is **permanent** — engagement history and PDF for the Nov 2025 "Abendruhe Farm Wellington" proposal will be lost. Confirm and I'll execute (data ops via the insert tool — no schema changes).
