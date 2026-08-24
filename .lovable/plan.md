# End-to-End Cession Agreement Test (report only, no code changes)

## Goal

Prove, with evidence, that the document a client reads on screen is the same document that ends up in the signed PDF and in the client's inbox — and show how it looks at each step.

No production code will be changed in this run. Findings and any defects get reported back for a separate decision.

## What gets tested

Using a disposable test proposal for a test client, signed in a real browser session:

1. **Acceptance page** — render the agreement at the client-facing acceptance URL. Screenshot the header, party details, and a sample of clauses (4.4.5, 5.6, 12.1.3 — the three that most recently changed).
2. **Signature capture** — sign via drawn signature, then repeat on a second test proposal with a typed name, to confirm both paths work and that typed-name validation against the client's real name behaves.
3. **Database record** — inspect the resulting `proposal_agreements` row: signature type, signature image path, IP, user agent, witness fields, and the `accepted_terms_version` value actually stored.
4. **Signed PDF** — download the generated PDF from the `signed-agreements` bucket, render it to images, and visually check: agreement pages present, signature image actually overlaid (not missing or misplaced), ANNEXURE A separator, proposal pages appended, owner/company details correct.
5. **Email** — confirm the client email is sent and that the attachment is the *signed* PDF, not the unsigned proposal fallback. Timing will be recorded, since the sender retries only 3 times at 1.5s before falling back.
6. **Text comparison** — mechanical clause-by-clause diff of the on-screen source and the PDF source to confirm they are still identical, with any divergence listed exactly.

## Cleanup

The test proposal, agreement row, storage objects, and test client records are deleted after evidence is captured. The test client's email address will be a throwaway address so no real person receives anything.

## Deliverable

A written report covering:

- Which document version is live and what it contains
- Screenshots of the on-screen agreement and rendered signed PDF pages
- Pass/fail per step above
- A defect list, expected to include at minimum the two structural risks already identified:
  - agreement text duplicated in two hand-synced places with no shared source
  - `accepted_terms_version` hardcoded to `'2.0'`, not derived from the document
  - the email fallback that can attach the unsigned proposal PDF if the signed one is late

## Technical notes

- On-screen source: `src/pages/ProposalAcceptance/components/TermsAndConditionsSection.tsx`
- PDF source: `supabase/functions/_shared/cession-agreement-pdf.ts`
- Signing endpoint: `supabase/functions/accept-proposal` (writes `proposal_agreements`, sets `accepted_terms_version: '2.0'`)
- Post-signature chain: `generate-signed-agreement-pdf` -> `signed-agreements` bucket -> `send-cession-agreement-email`
- Browser driven headless against the running app; PDF verified by rasterising and inspecting pages, not by reading code alone.
