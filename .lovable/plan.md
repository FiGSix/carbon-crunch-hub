
## Goal

Validate that the "private buckets + signed URLs" rollout works end-to-end for every user persona and that no regression was introduced. Confirm that the only way to read a `proposal-pdfs` or `signed-agreements` object is through `get-pdf-signed-url` after authorization.

## What we're testing

Touched surface area:

- Edge functions: `get-pdf-signed-url` (new), `generate-proposal-pdf`, `generate-cession-agreement-pdf`, `generate-signed-agreement-pdf`, `accept-proposal`, `send-cession-agreement-email`
- Frontend: `useProposalPdf.ts`, `useCessionAgreementPdf.ts`, `SignedAgreementDownloadButton.tsx`
- Storage buckets: `proposal-pdfs`, `signed-agreements` (now `public = false`)
- RLS / storage policies on `storage.objects`

## Test matrix

### A. Storage layer (direct, no app)

Run via `supabase--read_query` / direct HTTP probes.

1. `select id, public from storage.buckets where id in ('proposal-pdfs','signed-agreements')` → both `public = false`.
2. `GET https://<project>.supabase.co/storage/v1/object/public/proposal-pdfs/<known-path>` (no auth) → expect `400/404` (bucket not public). This is the leaked-link attacker case.
3. Same for `signed-agreements`.
4. List existing policies on `storage.objects` for these two buckets — confirm the old permissive `bucket_id = '...'` SELECT policies are gone (or proven unreachable).

### B. Edge function `get-pdf-signed-url`

Use `supabase--curl_edge_functions` with explicit `Authorization` headers per persona. For each call check: HTTP status, `signed_url` present, and that fetching `signed_url` returns a PDF (`application/pdf`, non-empty body).

Pick one real proposal that has a generated PDF and (if possible) one with a signed agreement. Identify via `supabase--read_query`:

```
select id, agent_id, client_id, client_reference_id, invitation_token, invitation_expires_at
from proposals where pdf_url is not null and deleted_at is null limit 5;
```

Personas to cover:

| # | Caller | kind | invitationToken | Expected |
|---|--------|------|-----------------|----------|
| 1 | unauth, no token | proposal | none | 403 |
| 2 | unauth, valid unexpired token | proposal | valid | 200 + signed URL works |
| 3 | unauth, expired token | proposal | expired | 403 |
| 4 | unauth, wrong token | proposal | random | 403 |
| 5 | admin user | proposal | — | 200 |
| 6 | agent that owns the proposal | proposal | — | 200 |
| 7 | teammate (same `company_members.company_id`, status `active`) of agent | proposal | — | 200 |
| 8 | unrelated authenticated user | proposal | — | 403 |
| 9 | client via `proposals.client_id` | proposal | — | 200 |
| 10 | client via `clients.user_id = auth.uid()` joined through `client_reference_id` | proposal | — | 200 |
| 11 | any of the above with `kind = signed_agreement` on a proposal that has an agreement | signed_agreement | — | 200 |
| 12 | `kind = signed_agreement` on a proposal with no agreement | signed_agreement | — | 404 `PDF not available yet` |
| 13 | bad input: missing `proposalId` / unknown `kind` | — | — | 400 |
| 14 | soft-deleted proposal (`deleted_at not null`) | — | — | 404 |
| 15 | `download` parameter set | — | — | signed URL contains `response-content-disposition=attachment; filename=...` |

Also verify CORS preflight (`OPTIONS`) returns 200 with the expected headers.

### C. PDF generation edge functions

For each, confirm: (a) it still uploads to storage, (b) it no longer relies on a public URL to read its own assets, (c) downstream consumers get a working file.

1. `generate-proposal-pdf` — invoke as agent. Then call `get-pdf-signed-url` and download. Run again with `forceRegenerate: true` to confirm overwrite path works.
2. `generate-cession-agreement-pdf` — invoke as agent for an accepted proposal. Verify `proposal_agreements` row updates and signed URL serves the new bytes.
3. `generate-signed-agreement-pdf` — confirm it now downloads the base PDF and the signature image via `supabaseAdmin.storage.download` (no public fetch). Watch logs for any 400 from storage.
4. `accept-proposal` — full client-acceptance flow end-to-end (see scenario E2 below). Check it does not persist a public URL anywhere.
5. `send-cession-agreement-email` — trigger and verify the email is sent with a non-empty PDF attachment. Check function logs for `download` calls instead of public `fetch`.

For each function: pull the last 50 log lines via `supabase--edge_function_logs` and grep for `getPublicUrl`, `/object/public/`, `403`, `404`, and stack traces.

### D. Frontend (browser automation against the preview)

Use the browser tool. The preview session is already authenticated as the current user.

For each scenario, watch the network tab for:
- a call to `functions/v1/get-pdf-signed-url` returning 200,
- a follow-up `GET` to `…/storage/v1/object/sign/<bucket>/<path>?token=…` returning `application/pdf`,
- no calls to `…/object/public/proposal-pdfs/...` or `…/object/public/signed-agreements/...`.

D1. **Admin** logged in:
- Open a proposal → click "Download PDF" (uses `useProposalPdf`). Confirm download.
- Open a proposal that has a signed agreement → `SignedAgreementDownloadButton` → confirm download.
- Trigger cession agreement download (`useCessionAgreementPdf`).

D2. **Agent** owning a proposal: same three downloads, all should succeed.

D3. **Teammate** (different user in same company as agent): downloads succeed.

D4. **Client** logged in (matched via `client_id` or `client_reference_id`): downloads succeed for their own proposals; attempt one that isn't theirs → expect failure with friendly toast, no crash.

D5. **Anonymous via invitation link**: open `/proposals/view?token=<valid>` (or whatever the public route is), click download → succeeds. Re-test after expiring the token in DB → download button shows error toast, page itself behaves consistently.

D6. **Leaked-URL attacker**: take an old `proposals.pdf_url` value from the DB and paste it directly into the browser → expect 400/404, no PDF served.

### E. End-to-end happy paths

E1. Agent generates proposal → sends invitation → client (anon) opens link → downloads proposal PDF → accepts proposal → cession agreement is generated → client downloads signed agreement → email is sent with attachment. Every step instrumented with the network checks in section D.

E2. Regenerate flow: agent edits proposal, hits regenerate, downloads new PDF, confirms file size/hash differs from previous.

### F. Negative / regression checks

- Search the codebase for any remaining direct usage of `getPublicUrl(` or hardcoded `/object/public/(proposal-pdfs|signed-agreements)/` strings. Any hit outside docs/migrations is a bug.
- `rg "pdf_url" src` and `rg "signed_pdf_url" src` — ensure no component reads these as URLs directly anymore (they should go through the signed-URL hook/edge function).
- TypeScript build passes (auto by harness).
- Confirm `proposal_agreements.signed_pdf_url` and `proposals.pdf_url` are still readable for the path-extraction logic in `get-pdf-signed-url` (the function tolerates either a path or a full URL via `extractStoragePath`).

## Deliverables

A single test report with, per scenario: status (pass/fail), HTTP codes seen, the relevant network entries, and edge function log excerpts. Any failure is fixed in code (frontend or edge function only — no plan changes), then the failing scenario is re-run before closing the report.

## Out of scope

- `onboarding-documents`, `company-logos`, `avatars`, `knowledge-hub` buckets.
- Performance/load testing of signed URL minting.
- Changes to invitation-token lifecycle.

## Risks during testing

- We will be calling real edge functions against the live Supabase project. We will only read existing proposals and only generate PDFs for proposals owned by the testing accounts. No destructive DB writes; no deletions.
- Token-expiry test (B3, D5) requires temporarily setting `invitation_expires_at` in the past on a chosen proposal. We will record the original value and restore it.
