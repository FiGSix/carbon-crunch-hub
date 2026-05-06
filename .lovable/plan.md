## Goal

Stop client PDFs (proposals + signed cession agreements) from being downloadable by anyone with a URL. Make both Storage buckets private and serve files through short-lived signed URLs that only authenticated, authorized users can mint.

## What changes

### 1. Storage (database migration)

- Set `proposal-pdfs` bucket → `public = false`.
- Set `signed-agreements` bucket → `public = false` (currently flagged public even though policies pretend otherwise).
- Replace the permissive `bucket_id = '...'` SELECT policies on `storage.objects` with policies that only allow:
  - admins (`is_current_user_admin()`),
  - the proposal's agent,
  - the proposal's client / `client_reference_id` owner,
  - same-company members of the agent.
  
  Lookup is done by joining the object's `name` (which already encodes the proposal id) back to `proposals` / `proposal_agreements`.
- Keep INSERT/UPDATE policies for the edge functions (they use the service role and bypass RLS anyway).

### 2. Edge functions (server side)

Files affected:
- `supabase/functions/generate-proposal-pdf/index.ts`
- `supabase/functions/generate-cession-agreement-pdf/index.ts`
- `supabase/functions/generate-signed-agreement-pdf/index.ts`
- `supabase/functions/accept-proposal/index.ts`
- `supabase/functions/send-cession-agreement-email/index.ts`

Changes:
- After uploading the PDF, return a **signed URL** (`createSignedUrl`, ~1 hour TTL) instead of `getPublicUrl`.
- For the email function, fetch the PDF using the service-role client (RLS bypass) to attach it — no public URL needed.
- Stop persisting public URLs in `proposals.pdf_url` and `proposal_agreements.signed_pdf_url`. Instead, store the **storage path** (e.g. `proposals/<id>.pdf`). The frontend mints a fresh signed URL on demand.
  - Migration: backfill existing rows by stripping the public URL prefix down to the path.

### 3. Frontend

Files affected:
- `src/hooks/proposals/view/useProposalPdf.ts`
- `src/hooks/proposals/view/useCessionAgreementPdf.ts`
- `src/components/proposals/view/SignedAgreementDownloadButton.tsx`

Changes:
- Replace direct `fetch(public_url)` with a call to `supabase.storage.from(bucket).createSignedUrl(path, 3600)` then fetch + blob download.
- `SignedAgreementDownloadButton` no longer reads `signed_pdf_url` as a URL — it reads the stored path and mints a signed URL on click. Button visibility logic stays the same.
- Loading/error states unchanged.

### 4. Public proposal viewing via invitation token

The proposal view page can be opened by an unauthenticated client through an invitation token. Two options for the PDF in that flow:

- **(A, recommended)** The PDF download button calls a small new edge function `get-proposal-pdf-url` that accepts `{ proposalId, invitationToken? }`, validates access (auth user via `can_view_proposal`, or matching unexpired token), and returns a freshly signed URL. Keeps signing server-side and respects token expiry.
- **(B)** Allow anon SELECT on storage objects when the matching proposal has a valid token in the request — more complex RLS, harder to audit.

Plan uses option A.

## Impact on users

- **Authenticated admins / agents / clients**: no visible change. Download buttons still work; under the hood they fetch a signed URL first (adds ~100–300 ms once per click).
- **Clients opening a proposal via emailed invitation link**: still works as long as the invitation token is unexpired. Once the token expires, the PDF download stops working — same as the rest of the proposal page today, so behavior is consistent.
- **Anyone with an old leaked PDF URL**: link stops working immediately after migration. This is the whole point.
- **Email attachments** (cession confirmation): unchanged for the recipient — PDF is still attached to the email.
- **Cached/bookmarked old `pdf_url` values**: become unusable. Acceptable because they were the leak vector.

## Risks & mitigations

- Backfill of existing `pdf_url` / `signed_pdf_url` rows must be correct, otherwise downloads break. Mitigation: a SQL `UPDATE … SET pdf_url = regexp_replace(pdf_url, '^.*?/object/public/<bucket>/', '')` with a dry-run `SELECT` first.
- Edge functions that previously fetched the PDF via public URL (email sender) must switch to the service-role storage client. Already partly done — straightforward change.
- Signed URL TTL: 1 hour. Long enough for a download, short enough that leaks are low-value.

## Out of scope

- `onboarding-documents` (already correctly private).
- `company-logos`, `avatars`, `knowledge-hub` — different sensitivity profile, not requested.

## Rollout order

1. Migration: add new strict storage policies (additive).
2. Deploy edge functions returning signed URLs + storage path.
3. Deploy frontend that mints signed URLs.
4. Backfill `pdf_url` / `signed_pdf_url` to paths.
5. Migration: flip buckets to `public = false` and drop the old permissive policies.

This order means the app keeps working at every step; only the final flip removes public access.
