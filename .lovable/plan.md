# Platform Broadcasts — pre-build findings and design decision

No code written yet. Below is what the database and repo actually contain, followed by the recommended build.

## 1. The "autonomous sales engine" tables — what is actually there

I queried every non-system schema. There are **no** `discovery_*`, `outreach_*`, or `sales_agent_*` tables in this database, and no separate schema holding them. What exists are four orphan tables — present in the DB, referenced nowhere in the repo except the auto-generated `src/integrations/supabase/types.ts`:

| Table | Rows | What it models |
|---|---|---|
| `agent_leads` | 359 | Partner-recruitment prospect list: company, contact, email, status, `last_outreach_at`, `outreach_count`, `converted_invitation_id` |
| `inbound_messages` | 29 | Replies pulled from a Microsoft **Graph** mailbox (`graph_message_id`, `conversation_id`, `intent`, `confidence`), keyed to `lead_id` and a dangling `enrollment_id` |
| `candidate_notes` | — | Free-text notes on recruitment candidates |
| `meetings` | — | Booked meetings from that same recruitment flow |

**Do any of them model campaigns, recipients, sends, or open/click tracking? No.**

- There is no campaign/sequence table, no send-attempt table, no per-recipient row, no open/click columns anywhere in this cluster. `inbound_messages.enrollment_id` points at an `enrollments` table **that does not exist** — the outbound half of that engine was either never created or was dropped. What survives is the *lead list* and the *inbound replies*, not a sending system.
- Delivery is via **Microsoft Graph**, not Resend, so even the transport differs from everything the platform sends today.
- Its purpose is 1:1 cold prospecting for partner recruitment. Broadcasts are 1:many announcements to existing platform users. Different audience, different transport, different lifecycle.

**Recommendation: build alongside, do not extend.** There is no "who did we email and what happened" system in those tables to duplicate — the risk you are guarding against does not exist here. The real duplication risk is with `email_events`, and the plan below avoids it by reusing that table rather than adding a second one.

Separately: `agent_leads` / `inbound_messages` / `candidate_notes` / `meetings` are dead weight in the schema with zero code behind them. Flagging, not touching — a decision for a later cleanup pass.

## 2. Current email plumbing — how it is wired

**Transport.** 22 edge functions send mail. Two patterns coexist: most use `new Resend(Deno.env.get("RESEND_API_KEY"))` from `npm:resend@2.0.0`; a few (`partner-api`, `create-referral-proposal`, `send-installer-invitation`) `fetch` `https://api.resend.com/emails` directly. Direct Resend account, not the Lovable connector gateway.

**Event ingestion.** `resend-webhook` receives Resend events and does two things:
1. If the `email_id` matches a row in `email_cta_events` (1,098 rows, logged by `send-weekly-roundup`), it stamps `opened_at` / `clicked_at`.
2. Otherwise it resolves the `email_id` to a proposal **only** via `proposal_automation_log.email_message_id`, writes a row to `email_events` (2,669 rows), bumps proposal engagement and may advance proposal status. If no match, it logs `proposal_not_found` and drops the event.

That last point matters: **`email_events.proposal_id` is NOT NULL**, so broadcast events cannot be stored there as-is.

**Suppression.** `client_email_suppressions` (currently 0 rows) plus two SECURITY DEFINER functions:
- `is_client_email_suppressed(email)` — true if on the suppression list **or** if that address ever produced a bounce/complaint in `email_events`.
- `can_send_client_email(email, cooldown_days := 7)` — suppression check plus a fatigue window: no send if the address received mail in the last N days, or if an agent logged manual contact in that window.

`emailSuppressionService.ts` is the frontend wrapper.

**How Broadcasts extends this rather than duplicating it:** reuse `client_email_suppressions` and both functions unchanged as the send gate; reuse `resend-webhook` as the single ingestion point by adding a broadcast branch; reuse `email_events` for event history via a nullable `proposal_id` plus a `broadcast_recipient_id`.

## 3. Resend Broadcasts — answer: we build our own sender

I checked the current Resend API reference. **Broadcasts do not accept an ad-hoc recipient list.** `POST /broadcasts` takes a `segment_id`, and a Segment is a saved filter over Contacts stored in Resend. Audiences are now marked **DEPRECATED** in the API reference; Segments replaced them and are equally list-based. There is no `to: [...]` field on a broadcast.

So the trade you described resolves against Broadcasts: using them would require syncing our user base into Resend as Contacts — exactly the list-drift problem you want to avoid, and it would put opt-out state in a second system.

**Decision: own sender.** We keep the live database as the sole source of truth for who receives mail, and we replicate the three things Broadcasts would have given us:

- **Unsubscribe handling** — our own token-signed unsubscribe endpoint writing to `client_email_suppressions` with `reason = 'unsubscribe'`, which the existing `is_client_email_suppressed` already honours across every platform email.
- **`List-Unsubscribe` / `List-Unsubscribe-Post` headers** — set per message via Resend's `headers` field on the standard send call. This is what mailbox providers require for bulk mail; we get parity, not a downgrade.
- **Per-campaign reporting** — from our own recipient rows joined to `email_events`, which is richer than Resend's per-broadcast view because it sits next to proposal and partner data.

## 4. The weekly roundup — isolation guarantees

**Does `send-weekly-roundup` call `can_send_client_email`? No.** A search across the whole `send-weekly-roundup/` directory returns zero hits for `can_send_client_email`, `is_client_email_suppressed`, or any suppression check. It sends to every eligible agent unconditionally. Only three functions use the gate today: `proposal-automation` (full `can_send_client_email` with the 7-day cooldown), and `send-contact-email` / `send-eligibility-proposal` (suppression-only, no cooldown).

So a broadcast cannot suppress that week's roundup — the roundup never asks. That direction is safe.

**But the reverse direction is a real risk, and it is the one that bites.** `can_send_client_email` computes its cooldown from `email_events`. Today only `resend-webhook` writes that table, and only for proposal emails. The moment broadcast events start landing in `email_events` (as section 3 proposes), every broadcast recipient enters a 7-day cooldown that would silently block `proposal-automation` follow-ups — a live, revenue-relevant flow. Left unhandled, sending a broadcast would mute proposal chasers for a week.

**Fixes, both required:**

1. **Scope the cooldown to proposal mail.** `can_send_client_email` gets an added predicate so its `email_events` lookup counts only rows with `broadcast_recipient_id IS NULL`. Suppression (bounce/complaint/unsubscribe) stays global — a hard bounce on a broadcast should still stop proposal mail. Only the *fatigue* window becomes proposal-scoped.
2. **Broadcasts do not consult the proposal cooldown.** `send-broadcast` calls `is_client_email_suppressed` (hard opt-outs only), never `can_send_client_email`. A proposal follow-up sent on Tuesday must not silently drop a Thursday announcement.

Net effect: the three channels — proposal automation, weekly roundup, broadcasts — share one suppression list and nothing else. None throttles another.

**Category opt-outs and the roundup.** The roundup is treated as its own channel, not a broadcast category:

- Broadcast categories (newsletter, partner updates, client/audit notices, etc.) live in a `broadcast_preferences` table keyed by email, one row per category. `send-broadcast` checks the category the campaign is tagged with.
- **The roundup is not one of these categories and `send-weekly-roundup` is not modified.** Opting out of every broadcast category leaves the roundup untouched.
- The unsubscribe endpoint has two distinct modes: a **category** unsubscribe (default from the `List-Unsubscribe` header on a broadcast — turns off that one category) and an explicit **all-mail** opt-out (writes to `client_email_suppressions`, which stops everything including transactional flows). The one-click header link only ever hits the category mode; the all-mail option requires a deliberate second click on the confirmation page.
- If you later want a roundup opt-out, it should be its own preference on the agent's profile with its own copy — not a broadcast category. Out of scope here.

## Technical plan

**New tables (all with GRANTs, RLS, admin-only policies):**
- `broadcast_campaigns` — name, subject, html/body, from-identity, audience definition (a stored filter, not a stored list), status (`draft`/`scheduled`/`sending`/`sent`/`cancelled`), schedule, counts, created_by.
- `broadcast_recipients` — one row per resolved address per campaign: campaign_id, email, resolved user/client/agent id, `status` (`pending`/`skipped_suppressed`/`sent`/`failed`), `message_id`, `skip_reason`, timestamps. Unique on (campaign_id, lower(email)).
- `broadcast_unsubscribe_tokens` — or a signed HMAC token derived from email + campaign, avoiding a table. Prefer the HMAC: no extra state.

**Changed:**
- `email_events.proposal_id` → nullable, plus nullable `broadcast_recipient_id` FK. Existing proposal rows and the proposal-status path are untouched.
- `resend-webhook` — add a third resolution branch: if `email_id` matches a `broadcast_recipients.message_id`, write the `email_events` row against the broadcast recipient and skip proposal-status logic entirely. Existing branches unchanged.

**New edge functions:**
- `resolve-broadcast-audience` — takes the campaign's audience filter, runs it against the live DB (roles, client/partner status, company, activity), returns the recipient set. Called for preview and again at send time, so the list is never stale.
- `send-broadcast` — resolves the audience, writes `broadcast_recipients`, then sends in batches. Each address passes `can_send_client_email` (with a configurable cooldown, defaulting to 0 for broadcasts so weekly-roundup fatigue rules don't silently drop announcements — surfaced as a per-campaign toggle). Sets `List-Unsubscribe` headers. Records `message_id` per recipient. Resumable: re-invocation only processes `pending` rows.
- `broadcast-unsubscribe` — public GET/POST, verifies the HMAC token, inserts into `client_email_suppressions`, renders a confirmation page.

**Frontend (admin only):** campaign list, composer with audience builder and live recipient count, test-send to self, schedule/send, and a per-campaign report reading from `broadcast_recipients` joined to `email_events`.

**Open item to confirm before building:** the audience segments you want on day one — I would start with All partners, All clients, All admins, Newsletter subscribers, and a company filter, but subscription state for a "newsletter" audience does not exist yet and would need an opt-in field on `profiles`.
