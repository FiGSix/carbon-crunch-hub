## Findings

The previous config fix was only partial. It did fix the Supabase gateway-level `403` problem for `get-pdf-signed-url`: the function now executes.

What I verified live for proposal `Oudam Citrus` (`77220360-f54f-4fa6-9de9-7681118ec048`):

- `proposal-pdfs` is private, as intended.
- The generated PDF object exists in storage.
- Calling `get-pdf-signed-url` with the valid invitation token returns `200` and a signed URL.
- Fetching that signed URL returns `200`, `content-type: application/pdf`, and a non-empty PDF body.
- Calling `get-pdf-signed-url` without a valid app auth token or invitation token returns the function’s own `403 Forbidden`, not the gateway `403`.

So the root cause is now narrowed to the authenticated UI flow, not missing storage bytes.

## Likely root cause

The current frontend always calls `generate-proposal-pdf` before asking for a signed URL. That function still has `verify_jwt = true`, so if the browser session is stale/invalid or the user is viewing via a token/public context, generation fails before signing/download can happen.

There is also legacy behavior still present:

- `generate-proposal-pdf` still stores a public storage URL in `proposals.pdf_url`, even though the bucket is now private.
- Several PDF functions still call `getPublicUrl(...)` and persist public-looking URLs.
- The user-facing toast hides the real failing step, so a `401`, `403`, signed-url failure, or storage fetch failure all collapse into “Could not download the PDF.”

## Implementation plan

1. **Make proposal download use the correct fast path**
   - Update `useProposalPdf` so normal “Download PDF” first asks `get-pdf-signed-url` for an existing PDF.
   - Only call `generate-proposal-pdf` if the signed-url function returns “PDF not available yet” or the user explicitly chooses “Regenerate & Download”.
   - This avoids unnecessary protected generation calls for already-generated PDFs.

2. **Keep generation protected, but make errors clear**
   - Preserve `generate-proposal-pdf` as authenticated-only for agents/admins.
   - Improve frontend error handling so the toast/log distinguishes:
     - not logged in / stale session,
     - forbidden access,
     - PDF not generated yet,
     - signed storage fetch failed.

3. **Remove public-URL assumptions at the root**
   - Change `generate-proposal-pdf` to store the storage object path instead of a public URL, or at minimum return/store a path-compatible value.
   - Keep `get-pdf-signed-url.extractStoragePath(...)` backwards-compatible with old public URLs already in the database.
   - Review the remaining `getPublicUrl(...)` calls in the touched PDF/agreement functions and convert the proposal/signed-agreement paths to private-bucket-safe storage paths.

4. **Add server-side diagnostics to `get-pdf-signed-url`**
   - Log authorization branch decisions without exposing tokens.
   - Log whether the caller was authorized as admin, owning agent, teammate, client, or invitation-token viewer.
   - This makes future “admin but forbidden” cases directly traceable in logs.

5. **Verify after implementation**
   - Test unauthenticated without token: expect `403`.
   - Test valid invitation token: expect `200` signed URL and PDF download.
   - Test the current preview/admin session with `curl_edge_functions`: expect `200` if the preview is logged in as a real admin.
   - Test storage signed URL fetch: expect `200 application/pdf`.
   - Search for remaining direct public proposal/signed-agreement URL usage outside backwards-compatibility code.

## Expected outcome

For Brian and admins, downloading an existing generated proposal PDF should no longer depend on regenerating the PDF first. The app will mint a fresh signed URL and download the private PDF directly, while regeneration remains available when explicitly requested.