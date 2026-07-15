
## Problem

After a client signs a cession agreement, two things are supposed to happen inside `accept-proposal`:

1. `generate-signed-agreement-pdf` runs → produces the PDF **with signatures + witnesses + signed watermark** and writes its URL to `proposal_agreements.signed_pdf_url`.
2. `send-cession-agreement-email` runs → emails the client (with the signed PDF attached).

Both are launched as fire-and-forget async IIFEs *after* the HTTP response is sent. Deno edge runtime terminates async work once the response returns, so:

- The signed PDF is frequently never generated → `signed_pdf_url` stays `NULL` → the "Download Signed Agreement" button is hidden and the user falls back to the "Download Agreement" button, which downloads the **unsigned** cession PDF (no signatures — matches what the user is seeing).
- The client email either never sends or sends *before* the signed PDF exists, so it falls back to the unsigned proposal PDF (or nothing).

## Fix

### 1. `supabase/functions/accept-proposal/index.ts`

Replace both fire-and-forget IIFEs (sections `// 9.` and `// 11.`) with a single awaited, sequential flow, wrapped in `EdgeRuntime.waitUntil()` so it survives past the response:

```
const postSign = (async () => {
  // a) Generate signed PDF and await it
  const { data: pdfRes, error: pdfErr } = await supabase.functions.invoke(
    'generate-signed-agreement-pdf',
    { body: { proposalId: proposal.id, agreementId: newAgreement.id } }
  );
  if (pdfErr) console.error(...);

  // b) Only then send the confirmation email so the signed PDF is attached
  //    (email fn reads proposal_agreements.signed_pdf_url written in step a)
  if (clientEmail) {
    await supabase.functions.invoke('send-cession-agreement-email', {
      body: { proposalId: proposal.id, clientEmail },
    });
  }
})();

// @ts-ignore — EdgeRuntime is a Deno Deploy global
EdgeRuntime.waitUntil(postSign);
```

Move the `clientEmail` resolution (proposal.content → profiles → clients) above `EdgeRuntime.waitUntil` so it's captured before the chain starts. The response to the browser is still returned immediately.

### 2. `supabase/functions/send-cession-agreement-email/index.ts`

Small hardening (no logic change to email body):

- Add a short retry (up to 3 attempts, 1.5s delay) on the `proposal_agreements.signed_pdf_url` fetch to cover the rare case where the row was updated in another region and not yet visible.
- Keep the existing fallback to the unsigned proposal PDF, but log a clear warning instead of silently attaching it.

### 3. One-time repair for already-signed proposals

Existing proposals that were signed while the bug was live have `proposal_agreements.signed_pdf_url = NULL` and never received the email. Add a small admin-only edge function `backfill-signed-agreements` (invoked manually) that:

- Selects `proposal_agreements` rows where `signed_pdf_url IS NULL` and the proposal is `approved` / `signed`.
- For each, invokes `generate-signed-agreement-pdf`, then optionally `send-cession-agreement-email` (behind a `sendEmail: true` flag so admins can regenerate the PDF without re-emailing the client).

The UI surface is a single button on the admin proposal detail page ("Regenerate signed PDF & resend"), reusing the existing admin auth check pattern from `upload-signed-agreement`.

## What we are NOT changing

- No changes to the cession PDF template, signature capture flow, or `SignedAgreementDownloadButton`.
- No schema changes.
- `generate-signed-agreement-pdf` already embeds the signature image / typed name and witness block correctly — it just wasn't running.

## Files touched

- `supabase/functions/accept-proposal/index.ts` — swap fire-and-forget for awaited chain inside `EdgeRuntime.waitUntil`.
- `supabase/functions/send-cession-agreement-email/index.ts` — add short retry on `signed_pdf_url` lookup + clearer warning log.
- `supabase/functions/backfill-signed-agreements/index.ts` (new) — admin-only repair endpoint.
- One small admin UI button to invoke the backfill per proposal (location: existing admin proposal actions area — will confirm exact file during build).

## Validation

- Sign a test proposal end-to-end; confirm (a) `proposal_agreements.signed_pdf_url` populates within a few seconds, (b) the "Download Signed Agreement" button appears and downloads a PDF whose last page shows the signature, witnesses, IP and timestamp, and (c) the client mailbox receives the email with that same PDF attached.
- Check edge function logs for `[Signed PDF]` and `[Cession Email]` sequences on a single signing event.
