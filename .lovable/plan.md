# Cockpit Chateau Gateau: signed status and duplicate records

## What the data actually shows

You are right — it is signed and it is in onboarding. My earlier "still in draft" note was about only one of several copies.

There are **7 proposals** all titled "Cockpit Chateau Gateau", all for Amit Abraham (SOCO Energy), all created by the same partner on 17 Dec 2025 between 19:16 and 19:26:

- All 7 have `signed_at = 2025-10-28` and a `proposal_agreements` row with `signature_type = legacy_import`, `typed_name = Amit Abraham`.
- All 7 point at the **exact same signed PDF file** (`legacy-1765998935795/...pdf`) and the same site address (39 Darter Ave, Khayalami Gardens, Midrand).
- All 7 already have their own `project_onboarding` record, so the Project Onboarding list shows the same project 7 times.
- 6 are status `pending`, 1 is `draft` (the last one, created 19:26 — that's the one I looked at last time).
- None have a system size captured, and none are linked to a `client_cession_signatures` record (legacy imports predate the master-signature model).

So this is not a signing problem. It is the same legacy project imported 7 times in one 10-minute session, and every copy landed in onboarding.

## What to fix

### 1. Collapse the duplicates to one project
- Pick the canonical record: the first `pending` proposal (created 19:16, `6925b4b5…`), since it carries the same signature and PDF as the rest.
- Before deleting anything, check the other 6 onboarding records for any data that was entered after import (system details, documents, comments, tasks, data access config). If only one copy has real onboarding data, that copy becomes the canonical one instead.
- Archive/delete the 6 redundant proposals and their onboarding rows using the existing archive/delete paths, so commissions, activity log and audit trails stay consistent rather than being hard-deleted around.

### 2. Set the survivor to a correct state
- Move the canonical proposal off `draft`/`pending` to the signed status the rest of the signed legacy portfolio uses, so it reports consistently in dashboards and weekly roundups.
- Capture the missing system size (kWp) and commissioning date on the surviving record — without a size it contributes nothing to MWp signed or revenue figures.

### 3. Stop this recurring
The legacy import path allowed the same project to be created 7 times. Add a duplicate guard on legacy import: before insert, look for an existing proposal with the same client and the same normalised site address (and same signature date), and either reuse it or reject the row with a clear "already imported" message shown in the import result summary. This mirrors the company-deduplication guard already in place.

## Technical notes

- Tables touched: `proposals`, `proposal_agreements`, `project_onboarding` (plus the child onboarding tables when checking for entered data).
- Deletion goes through the existing `delete_proposal` / `archive_proposal` functions rather than raw SQL deletes, so dependent rows are handled.
- The import guard lives in the legacy project creation path (bulk upload + Add Legacy Project dialog) and its validator, so both entry points are covered.
- No change to the current live signing flow or the Rev 6 cession document work.

## Open question

Do you want the 6 duplicates **archived** (hidden but recoverable) or **fully deleted**? Archiving is safer; deleting gives a cleaner onboarding list.
