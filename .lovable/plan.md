## Goal
Replace the "Shaun Slabber" sales persona with **Cora Black** (`cora@crunchcarbon.com`) across the Sales Agent — name, from-address, voice, signature, AI tone — while keeping Shaun as the CEO that Cora books meetings *for*.

## Persona to bake in
- **Name:** Cora Black
- **Role:** Partner Co-ordinator, Crunch Carbon
- **Email:** cora@crunchcarbon.com
- **Books meetings on behalf of:** Shaun Slabber (CEO)
- **Voice:** confident, efficient, warm-but-controlled, action-led, subtly premium. Short. Always ends with a clear next step. Never spammy, never "AI-chatbot" phrasing.

## Email signature (used on every outbound email + AI reply)
```
Kind regards,
Cora Black
Partner Co-ordinator
[Crunch Carbon logo]
```
- Logo source: `public/crunch-carbon-logo-new.png` — embedded as an `<img>` in the HTML signature block (hosted on the published domain so it renders in Outlook/Gmail clients).
- Signature is rendered as a reusable HTML helper (e.g. `coraSignature()`) imported by `send-cold-outreach`, `sales-agent-send`, `sales-agent-nudge`, and `sales-agent-draft-reply` so there is one source of truth.
- For the AI draft-reply prompt: the model writes the body only; the signature is appended programmatically after generation (so the model can't drift the signature).

## Changes

### 1. Settings defaults (DB migration)
Update `sales_agent_settings` defaults + the current row:
- `mailbox_address` → `cora@crunchcarbon.com`
- `bookings_cta_label` → `Pick a 30-min slot with Shaun`
- `notify_email` → unchanged (Shaun still gets internal alerts)
- Seed `ai_style_notes` with Cora's voice rules so the learning loop starts from the right baseline.

### 2. Shared signature helper (new)
`supabase/functions/_shared/coraSignature.ts` — exports `coraSignatureHtml()` returning the signature block (name, role, logo `<img>`). All sender functions import it.

### 3. AI draft-reply — `sales-agent-draft-reply/index.ts`
- Rewrite system prompt: identity = Cora Black, Partner Co-ordinator; voice rules (confident, efficient, warm, action-led, premium); 60–110 words; ends with one clear next step → booking link.
- Instruct the model: **do not include a sign-off or signature** — appended programmatically.
- After generation, `wrapHtml()` appends `coraSignatureHtml()` before sending.

### 4. Outreach senders — `send-cold-outreach/index.ts`, `sales-agent-send/index.ts`, `sales-agent-nudge/index.ts`
- `from:` → `"Cora Black <cora@crunchcarbon.com>"`
- Replace existing `emailFooter()` / inline signatures with `coraSignatureHtml()`.
- Remove hard-coded "Shaun Slabber" sign-off blocks.

### 5. Notify function — `sales-agent-notify/index.ts`
- Internal ops alerts: no persona change. Optionally add Cora signature only to admin-facing digests if desired (default: leave plain).

### 6. Existing sequence templates (DB)
Audit `outreach_sequences` step `body_template`s — strip any inline "Shaun" sign-offs so the shared signature isn't duplicated; rewrite copy into Cora's voice where needed.

### 7. UI copy — `SettingsTab.tsx`
- Helper text under `mailbox_address`: *"The Sales Agent persona (Cora Black, Partner Co-ordinator) sends from this address."*
- Bookings card: clarify Cora books slots **on Shaun's calendar**.

## Important caveat — Outlook mailbox
Outbound `From` is determined by the connected Outlook mailbox (`/me/sendMail`). Changing `mailbox_address` in settings is a label only. To truly send as `cora@crunchcarbon.com`:
- **(A)** Create `cora@crunchcarbon.com` in Microsoft 365 and reconnect the Outlook connector to that mailbox (recommended), **or**
- **(B)** Add `cora@crunchcarbon.com` as a send-as alias on Shaun's mailbox and set `from:` explicitly on the send call (replies still land in Shaun's inbox).

I'll ship code/UI/AI/signature changes so everything is ready for Cora, then flag the M365 step.

## Files touched
- `supabase/migrations/<new>.sql`
- `supabase/functions/_shared/coraSignature.ts` (new)
- `supabase/functions/sales-agent-draft-reply/index.ts`
- `supabase/functions/sales-agent-send/index.ts`
- `supabase/functions/send-cold-outreach/index.ts`
- `supabase/functions/sales-agent-nudge/index.ts`
- `src/components/admin/sales-agent/SettingsTab.tsx`

## Out of scope
- Creating the M365 mailbox / send-as alias
- Reconnecting the Outlook connector
- Non-sales-agent Shaun references (About page, calculator emails)