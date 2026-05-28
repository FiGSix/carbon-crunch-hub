## What's actually happening

After auditing every email path, here is the split today:

**Resend (platform identity — correct):**
- `send-proposal-invitation`, `proposal-automation`, `post-signature-automation`, `send-cession-agreement-email` → `proposals@crunchcarbon.com`, signed "The Crunch Carbon Team".
- `send-agent-invitation`, `send-client-invitation`, `send-client-team-invitation`, `send-team-invitation`, `send-partner-invitation`, `send-agent-approval-email`, `send-contact-email`, `send-audit-ready-email`, `send-weekly-roundup`, `send-calculator-results`, `send-eligibility-proposal`, `send-auth-email`, `partner-api` → `noreply@crunchcarbon.com`, signed "The Crunch Carbon Team" / "Warm regards, The Crunch Carbon Team".

**Outlook gateway / cora@ mailbox (Cora persona — correct):**
- `sales-agent-send`, `sales-agent-nudge`, `sales-agent-draft-reply`, `_shared/lead-ingest.ts → sendReply` (Cora's reply to Shaun's EPC email).

**The leak — Resend wearing the Cora mask:**
- `send-cold-outreach/index.ts` calls `resend.emails.send({ from: CORA_FROM, ... })` and appends `coraSignatureHtml()` ("Kind regards, Cora Black, Partner Co-ordinator · Crunch Carbon" + logo) to every template (`introduction`, `follow_up_1`, `follow_up_2`).

That's the single function that breaks the rule: it pushes Cora-branded mail out through Resend instead of the Outlook mailbox. Everything else is already clean — recipients of proposal / invite / contact / roundup mail are NOT being signed off as Cora.

## What to change

Cora persona must only ever leave via Cora's own mailbox. Resend stays platform-only.

### 1. Retire the Resend path in `send-cold-outreach`
Rewrite the function to delegate sending to the same Outlook code path used by `sales-agent-send`:
- Drop `import { Resend }`, `RESEND_API_KEY`, and the `resend.emails.send` call.
- Add a local `sendViaOutlook(to, subject, html)` helper identical to the one in `sales-agent-send/index.ts` (or extract both to `_shared/outlookSend.ts` and import from both — cleaner, follows the "no patches" rule). Returns `{ ok, error }` from the `/me/sendMail` endpoint.
- Reuse the existing HTML templates (`introduction`, `follow_up_1`, `follow_up_2`) unchanged — they already use `coraSignatureHtml()`, which is the correct persona for Outlook.
- Keep all existing side effects: `lead_outreach_history` insert, `agent_leads.last_outreach_at` / `outreach_count` update, AI personalization, blocklist / suppression check.
- Where the code stored `resend_message_id`, store `null` (Outlook `/me/sendMail` returns 202 with no body — same limitation `sales-agent-send` already accepts).
- Update the front-end caller(s) of `send-cold-outreach` — no contract change, only the underlying transport — so no UI work needed.

### 2. Shared Outlook helper
Create `supabase/functions/_shared/outlookSend.ts` exporting `sendViaOutlook({ to, subject, html })` and the two env-var lookups. Refactor `sales-agent-send/index.ts` to import it (delete the local copy) so there is exactly one place that knows how to talk to the Outlook gateway. This satisfies the project's "fix at the root, no layered patches" guideline.

### 3. Guard against regressions
- Add a top-of-file comment in `send-cold-outreach/index.ts` and `_shared/coraSignature.ts`:
  ```
  // Cora persona MUST be sent from cora@crunchcarbon.com via the Outlook
  // gateway. Never combine coraSignatureHtml/CORA_FROM with the Resend SDK.
  ```
- Remove the unused `CORA_FROM` export if nothing else imports it after the rewrite (grep first). This makes future misuse a compile error rather than a silent re-leak.

### 4. Verification
- Deploy `send-cold-outreach` and `sales-agent-send`.
- Trigger one cold outreach to a test lead, confirm:
  - It arrives from `cora@crunchcarbon.com` (Outlook), not via Resend.
  - It still appears in the cora@ Sent Items folder.
  - `lead_outreach_history` row is written.
- Trigger one platform email (e.g. agent invitation) and confirm it still ships from `noreply@crunchcarbon.com` signed by "The Crunch Carbon Team".

## Out of scope
- Auth emails, transactional templates, weekly roundup — already platform-signed, no change.
- Cora's reply tone / AI personalisation work — separate thread.
- Switching auth/transactional from Resend to Lovable Emails — not requested.
