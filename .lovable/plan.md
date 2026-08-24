# SOCO Energy: Monique cannot see Amit's proposal

## Answer

No. Monique Claassen (monique@soco.energy) cannot see the proposal created for Amit Abraham (amit@soco.energy), even though both are recorded as "SOCO Energy (Pty) Ltd".

## Why

There are **two separate company records with the identical name** "SOCO Energy (Pty) Ltd":

- Created 20 Jul 2026, no email domain set — Amit's client record is attached to this one.
- Created 11 Aug 2026 by Monique, email domain `soco.energy` — Monique's own client record is attached to this one, and she is its only member (account admin).

Team visibility works by company membership: a client user sees the projects of client records that share *their* company record. Because Amit sits under the older duplicate company, he is outside Monique's company, so his proposal is invisible to her.

Second, smaller point: Amit's proposal ("Cockpit Chateau Gateau") is still in **draft** status. Drafts are partner-side work in progress, so even once the companies are merged it would only appear to Monique when it moves past draft — worth confirming which behaviour you want.

## Proposed fix

1. **Merge the duplicate company.** Move Amit's client record (and any others pointing at the older duplicate) onto Monique's company record, carry over any fee/rate settings that were set on the old record, then delete the now-empty duplicate.
2. **Stop new duplicates being created.** Company auto-creation currently matches loosely, so a partner creating a prospect and a client self-registering produce two rows. Tighten matching so a company is reused when the email domain or the normalised company name already exists, and add a uniqueness guard.
3. **Clean up existing duplicates platform-wide.** Report on every other set of client companies sharing a name or domain so you can approve merges before they cause the same confusion.
4. **Confirm draft visibility.** Decide whether client team members should see draft proposals; if not, no change, and Amit's project becomes visible to Monique once the partner sends it.

## Technical notes

- `clients.client_company_id` is the link that drives `get_user_client_company_client_ids()`, used by the `proposals` select policies — so merging the company row is what restores visibility, no policy change needed.
- Duplicate rows: `ca2f3975-…` (Amit, legacy, no `email_domain`) and `e22a3ac6-…` (Monique, `email_domain = soco.energy`). Keep the domain-bearing row.
- Auto-creation paths to tighten: the `auto_create_client_company` / `clients_autolink_company` triggers and the prospect-creation path in the client creator, matching on `email_domain` first and normalised `company_name` second.
- The merge itself is a data change (repoint `clients`, then delete the orphan company); the matching hardening is a migration on the trigger functions plus a unique index on the normalised name/domain.
