## Goal

Let Shaun (or any authorized admin) email Cora's mailbox a list of EPCs — either as a CSV/Excel attachment or as a simple table/list in the body — and have those EPCs land in `agent_leads` automatically, ready for Cora's outreach sequences. No new inbox or third-party inbound service; we reuse the existing Outlook polling that already runs every 5 minutes.

## How it works

```text
Shaun's inbox  ──email──►  Cora's Outlook mailbox
                                   │  (polled every 5 min)
                                   ▼
                         poll-inbound edge function
                                   │
                  ┌────────────────┼────────────────┐
                  ▼                ▼                ▼
            booking parse   reply classify   NEW: lead ingest
                                                    │
                                                    ▼
                                           agent_leads table
                                       (+ candidate_notes log)
```

The trigger is the email subject. If the subject starts with `Leads:` (case-insensitive), the message is treated as a lead-ingest email instead of a reply. Everything else keeps working as it does today.

## What we'll build

1. **Allowlist of senders** — only emails from admins with `sales_agent_admin` role (or addresses listed in `sales_agent_settings.lead_ingest_allowlist`, a new text[] column) can ingest leads. Anything else is logged and ignored.

2. **Parser** — extend `poll-inbound` to:
   - Detect `Leads:` subject prefix.
   - Fetch the message's attachments via the Outlook connector (`/me/messages/{id}/attachments`).
   - Parse `.csv`, `.xlsx`, `.xls` attachments using the same column logic as the existing bulk lead upload (`src/utils/excel/leadParser.ts` headers: company_name, contact_name, email, phone, website, location, source, notes).
   - If no attachment, parse the email body as either a markdown/plain table or a one-per-line list (`Company, contact, email, phone` style).
   - Dedupe by normalized email (and by company_name when email is missing) against existing `agent_leads`.

3. **Insert** — bulk insert new rows into `agent_leads` with `source = 'Email ingest'`, `created_by = <sender's user_id>` when resolvable.

4. **Reply confirmation** — Cora auto-replies to Shaun with a summary: `Imported X, skipped Y duplicates, Z errors (see attached log).` Uses the existing `sales-agent-send` function.

5. **Audit trail** — write one `candidate_notes` row per imported lead (`kind = 'system_event'`, `body = 'Imported via email from shaun@…'`) and one `inbound_messages` row with `intent = 'lead_ingest'`.

6. **Settings UI** — small section in `SettingsTab.tsx` showing Cora's mailbox address, a copy button, the allowlist of sender emails (editable), and a short "how to" snippet:
   > Email `<cora's address>` with subject starting `Leads:` and a CSV/Excel attachment using the standard lead template.

## Technical notes

- **Files touched**
  - `supabase/functions/poll-inbound/index.ts` — branch on `Leads:` subject, call new helper.
  - `supabase/functions/_shared/lead-ingest.ts` (new) — attachment fetch, CSV/XLSX parsing (use `sheetjs` via `npm:xlsx@0.18.5`), body-list fallback, dedupe + insert.
  - `supabase/functions/poll-inbound/` — extend Graph `$select` to include `hasAttachments`, then fetch attachments only when needed.
  - `src/components/admin/sales-agent/SettingsTab.tsx` — new "Email Cora a lead list" card.
- **Database** — one migration:
  - `ALTER TABLE sales_agent_settings ADD COLUMN lead_ingest_allowlist text[] NOT NULL DEFAULT '{}'`.
  - No new tables; reuses `agent_leads`, `inbound_messages`, `candidate_notes`.
- **Security** — sender allowlist is enforced server-side in the edge function. Non-allowlisted senders get an auto-reply: "You're not authorized to send leads to Cora." Body parsing has a hard cap (500 rows per email) to avoid abuse.
- **No new infra** — Microsoft Outlook connector and the existing pg_cron job that calls `poll-inbound` cover delivery and polling. No Mailgun/SendGrid inbound parse, no new domain DNS, no new edge function deploys beyond `poll-inbound`.

## Out of scope

- Real-time webhooks (we keep the 5-minute poll).
- Sending leads to specific sequences from the email — all imports land in `status = 'new'` and follow the default sequence rules already in the Sales Agent.
- A separate "cora@" inbox — we use the already-connected Outlook mailbox.
