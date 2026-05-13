# Fix Cession Agreement: company info + download button

Two bugs are causing Frans-Johan's issue. Both live in the cession agreement flow.

## Bug 1 — "Download Agreement" button returns the proposal PDF, not the cession agreement

`src/hooks/proposals/view/useCessionAgreementPdf.ts` first calls `generate-cession-agreement-pdf` (which writes `cession-agreement-{proposalId}.pdf` into the `proposal-pdfs` bucket), then asks `get-pdf-signed-url` for `kind: 'proposal'`. That `kind` resolves to the path stored at `proposals.pdf_url` — i.e. the standard proposal PDF — so the user always downloads the proposal, never the freshly generated cession agreement.

**Fix:** stop routing through `get-pdf-signed-url`. Have `generate-cession-agreement-pdf` return a signed URL for the file it just wrote (or its known storage path), and download from that directly. Two clean options:

- Option A (preferred): edge function creates a signed URL with `createSignedUrl(fileName, TTL, { download: filename })` and returns `{ success, signed_url }`. Hook downloads from that URL. No second invoke needed.
- Option B: edge function returns the storage path/bucket; hook calls `supabase.storage.from('proposal-pdfs').createSignedUrl(...)` directly.

Either way, remove the `kind: 'proposal'` second call.

## Bug 2 — Company info doesn't pull through correctly

In `supabase/functions/_shared/cession-agreement-pdf.ts` (lines ~34–46), every field is read from the proposal **snapshot** (`proposalData.content.clientInfo.*`), not from the live `clients` row — even though `generate-cession-agreement-pdf` already joins `client:clients!proposals_client_reference_id_fkey(first_name, last_name, email, company_name, registration_number)`.

Specific problems:
- `ownerName` uses `clientInfo.name` (the contact person's full name), so for company clients the agreement says e.g. "Frans-Johan Smith" instead of his company.
- `registrationNumber` reads `clientInfo.registrationNumber`, which is rarely present on the snapshot → falls back to "Not Applicable" even when the client record has one.
- `companyAddress` reads `clientInfo.address` (almost never set on the snapshot) → falls back to the project/premises address, which is wrong for the registered office line.
- `ownerEmail` likewise comes from snapshot rather than the current client email.

**Fix:** resolve the data the same way the rest of the app does — live client row wins, snapshot is fallback. Mirror `src/utils/proposals/resolveClientInfo.ts`:

```text
ownerName        = client.company_name || (client.first_name + " " + client.last_name) || snapshot.companyName || snapshot.name
ownerEmail       = client.email || snapshot.email
registrationNo   = client.registration_number || snapshot.registrationNumber || "Not Applicable"
companyAddress   = client.address (if present) || snapshot.address || snapshot.companyAddress || premisesAddress
```

If `clients` doesn't have a usable registered-office address column, keep the existing premises fallback for that field only and surface the gap clearly in the agreement (current "[Company Address]" placeholder is preferable to the wrong address). Confirm column availability before wiring.

Also add a `signerName` separate from `ownerName` so the signing block (later in the doc) can still show the human signatory while the parties block shows the company.

## Files to change

1. `supabase/functions/_shared/cession-agreement-pdf.ts`
   - Accept the joined `client` row alongside `proposalData`.
   - Build the `CessionAgreementData` from live client first, snapshot second.
   - Use `company_name` for the Owner / party block.
2. `supabase/functions/generate-cession-agreement-pdf/index.ts`
   - Pass the joined `proposal.client` into `addCessionAgreementPages`.
   - Return a signed download URL for the freshly written `cession-agreement-{proposalId}.pdf` (Option A above).
3. `src/hooks/proposals/view/useCessionAgreementPdf.ts`
   - Use the signed URL returned by the edge function. Remove the second `get-pdf-signed-url` invoke.

## Verification

- Re-generate the cession agreement for Frans-Johan's proposal and confirm: company name, registration number, registered office, and email all match the live client record.
- Click "Download Agreement" and confirm the downloaded file is the cession agreement (title page reads "Carbon Right Cessionary Agreement"), not the proposal.
- Spot-check one individual (non-company) client to confirm the fallback to first/last name still works.

## Out of scope

- No changes to the signing flow, signed-agreement storage, or `proposal_agreements` table.
- No content/legal copy edits to the agreement itself.
