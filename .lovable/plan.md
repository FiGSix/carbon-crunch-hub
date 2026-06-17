## Goal

Make master-agreement auto-propagation reliable across every signing path, expand matching to handle duplicate client records, **clone the signing info (`proposal_agreements` row) onto every sibling proposal so each project carries its own signed agreement record into Onboarding**, and backfill Andrew Barnes.

## Root Cause Recap

1. **Signing path bypassed the logic.** Andrew's Arbour Arch was signed via `AttachSignedAgreementDialog.tsx`, which only inserts a `proposal_agreements` row — it never stamps the client or propagates to siblings. Only the `accept-proposal` edge function does that, and it wasn't the path used.
2. **Duplicate client records.** Andrew has two `clients` rows with different email spellings (`andrew@barnesprop.co.za` vs `andrew@barnesproperty.co.za`), so even a working per-`client_reference_id` propagation wouldn't have crossed them.
3. **Siblings get status only, not an agreement record.** Existing `accept-proposal` logic only flips sibling proposal status to `approved`. It never creates a `proposal_agreements` row for the sibling, so when those projects move to Onboarding the Agreement tab, signature timestamp, signed PDF link, etc. are empty.

## Fix Strategy — Root-Level, Not a Patch

Move all propagation into a Postgres trigger on `proposal_agreements` so every signing path (current and future) behaves correctly.

### 1. Database trigger (root fix)

`AFTER INSERT ON proposal_agreements`, run a SECURITY DEFINER function `propagate_master_agreement()`:

- Load the proposal and its `client_reference_id`.
- Stamp `clients.cession_signed_at = NEW.signed_at` and `first_agreement_id = NEW.id` on the signed client (only if `cession_signed_at IS NULL`, preserving first-agreement time).
- Build a **candidate-client set** to propagate to — match by any of:
  - same `client_reference_id`
  - same normalized email (`lower(trim(email))`)
  - same normalized full name (`lower(trim(first_name||' '||last_name))`) AND at least one side has a null email (reduces false positives between unrelated namesakes)
- Stamp `cession_signed_at` + `first_agreement_id` on matched clients without one.
- For every sibling proposal under any matched client (excluding NEW.proposal_id, status in `('draft','sent','delivered','opened','viewed','stale')`, not archived/deleted):
  - **Clone the agreement**: insert a new `proposal_agreements` row pointing at the sibling `proposal_id`, copying `signed_by`, `signed_at`, `signature_type`, `signature_type_used`, `typed_name`, `signed_pdf_url`, `accepted_terms_version`, with `metadata = jsonb_build_object('source','master_agreement_propagation','origin_agreement_id', NEW.id, 'origin_proposal_id', NEW.proposal_id)`.
  - Update the sibling proposal: `status='approved'`, `signed_at=NEW.signed_at`.
- Guard against recursion: the trigger checks `NEW.metadata->>'source' <> 'master_agreement_propagation'` before propagating, so cloned rows don't re-fire propagation.

Indexes added: `clients(lower(trim(email)))` and `clients(lower(trim(first_name||' '||last_name)))`.

### 2. Code cleanup

- `supabase/functions/accept-proposal/index.ts` — remove duplicated stamping + batch-update blocks (steps 7 & 8) and the pre-check at lines 121–135. Keep only the proposal-status update + agreement insert; trigger handles the rest.
- `src/components/onboarding/AttachSignedAgreementDialog.tsx` — also update the attached proposal's own `status='signed'` / `signed_at` (currently missing). Trigger handles propagation.
- `src/hooks/proposals/operations/useApproveProposal.ts` — no changes needed.

### 3. Backfill Andrew Barnes

One-off data update:

- Stamp both Andrew client rows (`a42857fe…`, `e7541733…`) with `cession_signed_at = '2026-06-12 11:01:53.727+00'` and `first_agreement_id = '8db704fd…'` (Arbour Arch agreement).
- Clone the Arbour Arch `proposal_agreements` row onto proposal `df764786…` ("1931 Woodburn Square") with the propagation metadata marker, then set that proposal to `status='approved'`, `signed_at='2026-06-12 11:01:53.727+00'`.
- Leave Ashley & Jeremy Barnes alone — different person.

### 4. Verification

```sql
SELECT id, first_name, last_name, email, cession_signed_at, first_agreement_id
FROM clients WHERE last_name ILIKE '%barnes%';

SELECT p.id, p.title, p.status, p.signed_at, pa.id agreement_id, pa.signed_pdf_url
FROM proposals p LEFT JOIN proposal_agreements pa ON pa.proposal_id = p.id
WHERE p.client_reference_id IN ('a42857fe…','e7541733…');
```

Expect both Andrews stamped, Woodburn Square = `approved` with a cloned agreement row carrying the same signed PDF + signer info as Arbour Arch.

## Trade-offs (Reconfirming Your Earlier Choices)

- Matching across duplicate clients uses normalized email plus a stricter name-match fallback (only when one side has no email) to avoid cross-propagating between unrelated namesakes. Say the word if you want email-only.
- Cloned agreement rows reuse the original `signed_pdf_url` rather than duplicating the file in storage. The same PDF is referenced from every sibling project's Agreement tab. Acceptable for offline-signed scans; let me know if you'd prefer a per-proposal copy.

## Files / Migrations

- New migration: `propagate_master_agreement()` trigger function + trigger on `proposal_agreements` + two functional indexes on `clients`.
- Edit: `supabase/functions/accept-proposal/index.ts` (remove duplicated propagation logic).
- Edit: `src/components/onboarding/AttachSignedAgreementDialog.tsx` (also update proposal status on attach).
- Data update: stamp Andrew's two client rows, clone Arbour Arch agreement onto Woodburn Square, mark Woodburn approved.
