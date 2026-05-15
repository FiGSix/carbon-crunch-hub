# Client Sign-Proposal Nudge — Bi-Weekly

## Goal

Push clients to sign proposals that agents/partners have sent them. Stop the moment everything is signed — no ongoing "update" noise.

## Audience & cadence

- **Who**: Only clients with at least one proposal in a pre-signature state (sent / delivered / opened / clicked, not yet `accepted` / `signed` / `declined` / `expired`).
- **Cadence**: Every 14 days, per client.
- **Stop condition**: Client has zero unsigned proposals → no email that cycle.
- **Suppression**: Skip if any unsigned proposal already received a 1:1 follow-up (existing `proposal-automation` 3-day / 5-day nudge) in the last 3 days, to avoid stacking.

## Email shape

One email per client, listing every unsigned proposal in their portfolio:

- Subject (single proposal): "Your {{projectName}} proposal is waiting for your signature"
- Subject (multiple): "You have {{n}} proposals waiting for your signature"
- Opening: short, direct — "Signing unlocks your project and starts your 2025–2030 revenue clock."
- Body: list of proposals with project name, agent/partner name, system size (kWp), days since sent, and a per-proposal "Review & sign" button linking to the existing proposal view URL.
- Footer: who to contact (their agent), unsubscribe (system-managed).

This is transactional — each row corresponds to a real, recipient-initiated event (agent sent them a proposal). Goes through the existing Lovable Emails / `send-transactional-email` infrastructure.

## Why bi-weekly + grouped

- Per-proposal nudges already exist (3-day, 5-day, stale at 14d) in `proposal-automation`. Adding a weekly portfolio email on top would stack and burn deliverability.
- Bi-weekly + grouped gives clients one consolidated reminder of *everything* outstanding, distinct from the per-proposal chase emails.
- Naturally self-terminating: signs everything → drops out of the audience → mailbox gets quiet → trust preserved for real transactional mail (cession, vintage statements).

## After signing — handoff to agent momentum

Once a client signs, they exit this nudge audience. From that point the agent's Weekly Momentum Report drives the project forward (audit submission, vintage issuance). Client only hears from the platform on real milestones (audit-ready, first vintage, annual statement) — no recurring "update" emails.

## Technical notes

- New cron edge function: `client-signature-nudge`, scheduled every 14 days (pg_cron + pg_net), or daily with a per-client `last_nudge_sent_at` check (preferred — spreads load, handles new clients immediately).
- Per-client query: join `proposals` → `clients`, filter `status NOT IN ('accepted','signed','declined','expired','stale')`, group by client.
- New table column or settings field: `clients.last_signature_nudge_at TIMESTAMPTZ` (or row in existing `email_send_log` keyed by `template_name='client-signature-nudge'` — query that instead to avoid schema change).
- New transactional template `client-signature-nudge.tsx` registered in `_shared/transactional-email-templates/registry.ts`.
- Invokes `send-transactional-email` with `idempotencyKey = client-nudge-{clientId}-{yyyy-ww}` (biweekly bucket), `templateData = { firstName, proposals: [...] }`.
- Respects `suppressed_emails` automatically via the existing send pipeline.
- Skip clients with a `proposal-automation` follow-up in the last 3 days (query `email_send_log`).

## Out of scope (for now)

- Milestone emails (audit submitted, first vintage, annual statement) — separate workstream, only triggered post-signature.
- Any client newsletter / product update / re-engagement content (would be marketing, not allowed on this infra).
