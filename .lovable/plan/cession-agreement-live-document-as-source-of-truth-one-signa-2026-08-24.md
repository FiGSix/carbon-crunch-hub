# Cession Agreement: live document as source of truth, one signature per client

## Why the wrong version is being signed

The signing flow never reads Admin → Legal Documents. The agreement wording lives hardcoded in two places — the typesetting code inside the signed-PDF builder, and the on-screen terms component on the acceptance page. Both hold the older "Revision 8" wording. Every cession row in `legal_documents` is currently inactive and is read by nothing except the admin list page, and the version stamped on each signature is the literal string `2.0`. So publishing a revision in the admin screen has no effect on what a client reads or signs.

## What gets built

### 1. Legal Documents becomes the real source

- Admin uploads the original agreement file (PDF or Word) against a revision record. It is stored privately and is the canonical legal text — never re-typed or paraphrased. Word uploads are converted to PDF at upload time so the signing-time splice always works on a PDF.
- On upload the text is extracted and stored on the record, used for the on-screen "read before you sign" panel and as a plain-text fallback.
- Exactly one cession revision is **Live** at a time, set by a **Set as live** button with a confirmation. Version numbers are labels only — no "highest wins", so Rev 6 can be live over higher-numbered records.
- The list shows Live / Published / Draft / Archived, plus who set it live and when.
- The uploaded Rev 6 file supplied with this request is the document used for verification.

### 2. Signing uses the live revision

- The acceptance page renders the live revision's extracted text. The scroll-to-bottom gate, consent checkbox and signature capture behave exactly as they do today.
- The signed PDF is assembled as: proposal pages → the live agreement's own pages spliced in verbatim from the uploaded file → generated party-details and signature-confirmation pages. Nothing re-typesets the legal wording.
- Party details (owner name, registration number, address, email, place and date of signing) go on their own generated page, so the blank fill-in lines in the source are answered without altering the original pages.
- The signature record stores the live revision's id, version and title instead of `2.0`.
- Both hardcoded copies of the agreement are deleted once the live path replaces them.

### 3. One signature, many project documents

A client may hold several proposals for several sites. They go through the signing ceremony **once**; that act covers all their proposals, present and future. Each proposal still gets its own generated, fully signed-looking PDF with that proposal's own site and party details. The source agreement supports this: the cession is tied to the systems "at the following address(es) as indicated on the electronic Portal", so the addresses live in the platform, not the contract prose.

- The signature is modelled at the client level. The first acceptance by a client with no prior signature creates one **master signature** record (agreement text/version signed, signature capture, consent metadata, timestamp) and generates that proposal's own PDF from it.
- Every other proposal for that client — existing or created later — reuses the master signature. No signing UI is ever shown again. Opening such a proposal generates its own PDF on the spot: the master agreement pages verbatim + that proposal's party-details/site page + a stamped copy of the signature block.
- Each proposal's PDF is its own record and its own file in storage. Only the signature and agreement text are shared.
- A new live revision never touches an existing master signature. Clients who already signed keep inheriting their original signature and keep generating documents from the revision they actually signed. Only clients with no signature yet pick up the new live revision. Nothing is rewritten retroactively.
- Inheritance is not silent: the proposal moves to its normal accepted/signed status with all the downstream automation a full signing fires today (onboarding kickoff etc.), and its own PDF is emailed to the client. The only thing skipped is the ceremony itself.
- Proposals already signed before this change keep their original text, PDF and version stamp untouched.

### 4. Set-as-live impact and re-notify

- The affected count and re-notify action concern only clients who have never signed — never clients with an existing master signature.
- One email per affected client, covering however many of their proposals are impacted, reusing the existing proposal invitation email path.

### 5. Bugs fixed in the same pass

- `signed_pdf_url` is written as a public URL although the bucket is private, so the stored link returns "Bucket not found". Store the object path and mint signed URLs on demand wherever it is used or emailed; backfill existing rows.
- The developer "Auth Status" widget renders on the public signing page — hide it outside development.
- Four `406` responses on load come from anonymous direct reads of `clients`; route them through the token RPC that already serves the page.
- The proposal's own "Acceptance" block renders empty — populate or remove it.
- System size shows as a bare number on the acceptance page — add the kWp unit.

## Technical notes

- `legal_documents` gains `file_path`, `file_mime`, `is_live`, `set_live_at`, `set_live_by`, with a partial unique index enforcing one live row per `document_type`.
- New **private** bucket `legal-documents`: admin-only write, read via service role and short-lived signed URLs.
- New security-definer function `get_live_legal_document(document_type)` so the anonymous acceptance page reads the live text and file path without exposing the table.
- New table `client_cession_signatures`: one row per client per master signing event — client id, `legal_document_id`, `legal_document_version`, signature capture, consent metadata (IP, user agent, timestamp), `signed_at`. Grants + RLS: client reads own, admins read all, service role full.
- `proposal_agreements` becomes the per-proposal generated-document record: add `client_cession_signature_id`, `legal_document_id`, `legal_document_version`, `pdf_path`, `generated_at`. `accepted_terms_version` is populated from the linked document.
- Before showing signing UI, the acceptance page checks for a valid `client_cession_signatures` row; if found it goes straight to generating that proposal's PDF.
- `generate-signed-agreement-pdf` switches from typesetting to `pdf-lib` splicing, with two entry paths: first-time signing (create master signature, then generate) and inherited (generate referencing the existing signature).
- `accept-proposal` resolves or creates the master signature and records its id plus the document id/version on the proposal's agreement row.

## Verification

Create a throwaway client with two proposals at different sites. Upload the supplied Rev 6 file in Admin → Legal Documents and set it live. Open proposal A's token link, confirm the on-screen text matches Rev 6 exactly, and sign. Check the master signature row exists, proposal A's PDF holds the Rev 6 pages verbatim plus its own party-details page, and the confirmation email link works as a signed URL. Open proposal B: no signing UI, its own PDF generated with its own site details referencing the same master signature, status moved to signed, PDF emailed. Create a third proposal afterwards and confirm the same inheritance. Confirm a pre-change signed proposal is untouched. Delete the test data.
