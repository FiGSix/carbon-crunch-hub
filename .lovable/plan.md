## Goal

1. Move the **Arbour Arch** proposal (`361d6a1a-43b8-4e54-ad29-68c1beccbe8c`, currently `delivered`) into onboarding — same effect as the existing bulk-move flow.
2. Give admins a way to attach the offline-signed PDF to the proposal so it shows up in the agreement record (today there's only an upload path inside `AddLegacyProjectDialog`, which is for brand-new legacy imports, not existing proposals).

## Step 1 — Move Arbour Arch to onboarding (one-off data change)

Execute a single SQL transaction that mirrors `bulk-move-to-onboarding`:

- Update `proposals` row `361d6a1a…`: `status='signed'`, `signed_at=now()`, `updated_at=now()`.
- Insert into `project_onboarding`: `proposal_id=361d6a1a…`, `onboarding_complete=false`, `data_access_verified=false`, `audit_ready=false`.
- Insert into `onboarding_fields` for that new project, pulling `installer_company_name` / `installer_email` from the proposal's agent (same lookup the edge function does — falls back to "To be confirmed").
- Insert into `proposal_automation_log`: `automation_type='bulk_move_to_onboarding'`, `trigger_event='admin_manual_move'`, `old_status='delivered'`, `new_status='signed'`, details note "manual single-proposal move for Arbour Arch".

No `proposal_agreements` row is created in this step — that comes from the upload in step 2 so the audit trail reflects the real signed-at date on the offline PDF.

## Step 2 — Admin "Attach signed agreement" UI

New component `AttachSignedAgreementDialog` mounted on the proposal view (admin-only, visible when `proposals.status IN ('signed','delivered')` and no `proposal_agreements` row yet).

Flow:
1. File picker → upload to `signed-agreements` bucket at `manual/{proposal_id}/{timestamp}-{filename}.pdf` (reuse upload helper from `AddLegacyProjectDialog`).
2. On success, insert a `proposal_agreements` row:
   - `proposal_id` = Arbour Arch (or whichever proposal is open)
   - `signed_by` = current admin user (your `auth.uid()`)
   - `signed_at` = now (today, per your answer)
   - `signature_type` = `manual_upload` (existing enum value used by the legacy importer)
   - `signature_type_used` = `manual_upload`
   - `typed_name` = admin display name
   - `accepted_terms_version` = current terms version constant
   - `signed_pdf_url` = uploaded URL
   - `metadata` = `{ source: 'admin_manual_attach', uploaded_by: <admin id>, original_filename: ... }`
3. Toast + close, refresh the proposal view so `SignedAgreementDownloadButton` picks up the new URL.

Gated by `has_role(auth.uid(),'admin')` in the UI; insert is protected by the existing RLS policy on `proposal_agreements`.

## Out of scope

- No changes to the `bulk-move-to-onboarding` edge function.
- No changes to onboarding KPIs, dashboards, or email notifications.
- Not building bulk upload of signed PDFs — single proposal only for now.

## Technical notes

- Verify the `signature_type` enum accepts `manual_upload`; if not, add it via migration before the UI insert can succeed.
- Confirm RLS on `proposal_agreements` allows admin inserts; if it only allows the signer, add an `admin` insert policy in the same migration.
- Storage bucket `signed-agreements` already exists (private). Reuse the same signed-URL download pattern `SignedAgreementDownloadButton` uses.
