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

Correction to my earlier note: `agent_leads` / `inbound_messages` / `candidate_notes` / `meetings` are **real business data — a live prospect list**, not cleanup fodder. They are out of scope and will not be touched, now or in any later cleanup pass.

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

## 5. Day-one segments

Built in this order, each as a named resolver behind one `resolve-broadcast-audience` function. The audience is stored as a filter definition, never as a frozen list, and is re-resolved at send time.

1. **Clients with a project at a given onboarding stage** — the primary case, built first and built robustly. Filter over `project_onboarding` (status, plus the `audit_ready` flag) joined out to the client contacts on the project. Supports multi-select stages. Preview shows the resolved projects behind the count, not just a number, so an audit-window send can be eyeballed before it goes.
2. **Partner hierarchy** — partners of a given super partner (via the SP link/recruit relationship), and clients of a given partner (via `proposals.agent_id` / client ownership).
3. **Role buckets** — all partners, all clients, all admins, all users.
4. **Manual pasted list** — free-text addresses, normalised and de-duplicated, still passed through suppression.
5. **Company filter** — by `companies` / `client_companies`.
6. **Newsletter subscribers** — category defined, audience **not built**.

**No newsletter opt-in field on `profiles`.** That audience includes non-users, so it needs its own subscriber table with double opt-in and stored consent proof. Separate piece of work, later.

## 6. Categories — fixed at three, enforced in the sender

| Category | Opt-out-able | Unsubscribe link | `List-Unsubscribe` header | Consults `broadcast_preferences` |
|---|---|---|---|---|
| `operational` — audit windows, project milestones | No | Never rendered | Never set | No |
| `opportunity` — partner benefits, deals, programme changes | Yes | Always rendered | Always set | Yes |
| `newsletter` — defined now, no audience or signup yet | Yes | Always rendered | Always set | Yes |

`operational` still respects hard bounces/complaints and all-mail suppressions via `is_client_email_suppressed`. It concerns a service the recipient has contracted for — a client must not miss an audit window because of an unsubscribe click months ago.

**Structural enforcement, not UI convention.** A single `CATEGORY_POLICY` map in `_shared/` is the only source of these rules. The sender derives headers, footer and gating from it:

- The unsubscribe token is only minted when `policy.unsubscribable` is true; the template receives `unsubscribeUrl: null` for operational and renders no link — there is no token to render, so it cannot be forced from the UI or the campaign record.
- `List-Unsubscribe` / `List-Unsubscribe-Post` headers are built from the same nullable token, so they are structurally absent on operational mail.
- Preference gating is not an `if` the caller can skip: recipients pass through one `applyCategoryGate(category, emails)` that returns everyone for `operational` and filters against `broadcast_preferences` for the other two. There is no code path to the send call that bypasses it.
- `broadcast_campaigns.category` is a Postgres enum, so no fourth category can be introduced by data alone.

## 7. Pre-migration audit — `email_events.proposal_id`

Checked before proposing the `NOT NULL` drop. Everything that reads the column:

| Dependency | Reads `proposal_id` how | Safe with nulls? |
|---|---|---|
| RLS `Agents can view email events for their proposals` | `EXISTS (SELECT 1 FROM proposals p WHERE p.id = email_events.proposal_id ...)` | Yes — a null yields no match, so broadcast rows are simply invisible to that policy. **Needs a companion admin-visibility policy** for broadcast rows, or admins see nothing. |
| RLS `System can insert email events` | `WITH CHECK true` | Yes |
| FK `email_events_proposal_id_fkey` → `proposals(id) ON DELETE CASCADE` | — | Yes, nullable FKs are unenforced on null |
| `EmailActivityTimeline.tsx` | `.eq('proposal_id', proposalId)` | Yes — nulls excluded |
| `send-weekly-roundup/funnel.ts` | `.in('proposal_id', proposalIds)` | Yes — nulls excluded |
| `resend-webhook` | Only inserts after resolving a proposal; returns early otherwise | Yes |
| `classify_proposal_engagement()` | Joins through `proposal_id` | Yes |
| `can_send_client_email()` / `is_client_email_suppressed()` | Match on `recipient_email`, **not** `proposal_id` | **No — see below** |
| View `portfolio_reminder_candidates` | Aggregates `email_events` by `lower(recipient_email)`, and calls `can_send_client_email` | **No — see below** |

**No `.single()` call anywhere reads `email_events`**, so there is no query that would newly break on a null.

**Two real cross-contamination points found, both by `recipient_email` rather than `proposal_id`:**

1. `can_send_client_email` — the cooldown fix in section 4 handles it (`broadcast_recipient_id IS NULL` predicate).
2. `portfolio_reminder_candidates` — its `last_portfolio_send` CTE matches any `email_events` row whose subject is `ILIKE '%portfolio%'`. A broadcast with "portfolio" in the subject line would suppress genuine portfolio reminders for 14 days. Same fix: add `broadcast_recipient_id IS NULL` to that CTE. The view also calls `can_send_client_email`, so it inherits fix 1 automatically.

That second one would not have surfaced from a `proposal_id` search — worth flagging as the actual risk in this migration.

**Migration order:** add `broadcast_recipient_id` first, then drop `NOT NULL`, then patch `can_send_client_email` and recreate the view in the same migration, so no window exists where broadcast rows can be written but the guards are not yet in place.

## 8. Technical plan

**New tables (all with GRANTs, RLS, admin-only policies):**
- `broadcast_campaigns` — name, subject, html/body, from-identity, `category` (enum: `operational`/`opportunity`/`newsletter`), audience definition (a stored filter, not a stored list), status (`draft`/`sending`/`sent`/`cancelled`/`failed`), counts, created_by.
- `broadcast_recipients` — one row per resolved address per campaign: campaign_id, email, resolved user/client/agent id, `status` (`pending`/`skipped_suppressed`/`skipped_opted_out`/`sent`/`failed`), `message_id`, `skip_reason`, timestamps. Unique on (campaign_id, lower(email)).
- `broadcast_preferences` — per-email, per-category opt-out state. No rows are ever written for `operational`; the roundup is deliberately not a category here.
- Unsubscribe links use a signed HMAC token derived from email + campaign + mode, so no token table is needed.

**Changed:**
- `email_events.proposal_id` → nullable, plus nullable `broadcast_recipient_id` FK, plus an admin-visibility RLS policy for broadcast rows.
- `can_send_client_email` — cooldown lookup restricted to `broadcast_recipient_id IS NULL`. Suppression behaviour unchanged.
- `portfolio_reminder_candidates` — same predicate added to its `last_portfolio_send` CTE.
- `send-weekly-roundup` — **not modified**.
- `resend-webhook` — **bounce/complaint half of the broadcast branch ships in v1.** Today the function returns early with `proposal_not_found` for any unmatched `email_id`, which would silently drop every broadcast bounce and leave `is_client_email_suppressed` blind — on a new sending subdomain that is the fastest route to a wrecked reputation. Before that early return, add: if `event.type` is `email.bounced` or `email.complained`, look up `broadcast_recipients.message_id`; on a match, write the `email_events` row with `broadcast_recipient_id` set and `proposal_id` null, mark the recipient row `failed` with the bounce reason, and upsert `client_email_suppressions` with reason `bounce` / `complaint`. All other event types (`opened`, `clicked`, `delivered`) keep hitting the existing early return until the reporting roll-up is built. Proposal branches unchanged.

**New edge functions:**
- `resolve-broadcast-audience` — runs the campaign's filter against the live DB, returns the recipient set with enough context to preview. Called for preview and again at send time, so the list is never stale.
- `send-broadcast` — resolves the audience, writes `broadcast_recipients`, then sends in batches. Gated by `is_client_email_suppressed` plus `applyCategoryGate` — **never** by `can_send_client_email`. Records `message_id` per recipient. Resumable (re-invocation processes only `pending` rows) and cancellable (checks campaign status between batches).
- `broadcast-unsubscribe` — public GET/POST, verifies the HMAC token. Category mode (the one-click header target) writes `broadcast_preferences`; all-mail mode requires a deliberate second click and writes `client_email_suppressions`. Rejects any token bearing an operational campaign.

**Frontend (admin only):** campaign list, composer with category selector, audience builder with live recipient count and resolved-project preview, test-send to self, and the send flow with a confirmation showing the final count.

## 9. Build order and scope

Ship after step 3 — the goal is a real audit-comms send as early as possible.

1. Migration (tables, enum, `email_events` changes, cooldown and view fixes), `resolve-broadcast-audience` with the onboarding-stage and partner-hierarchy segments, `broadcast_preferences`, `broadcast-unsubscribe`.
2. `send-broadcast` — batching, suppression and category gating, cancellation, resumability — plus the `resend-webhook` bounce/complaint branch, shipped alongside it so no broadcast goes out before bounces are being captured.
3. Admin composer, audience builder with live count, test-send to self, send flow.

**Explicitly deferred until after real use:** scheduled sends, campaign duplication, the full per-campaign reporting UI, the open/click half of the `resend-webhook` roll-up, the remaining segments (role buckets, manual list, company filter can follow quickly if needed), and the public newsletter signup with its subscriber table and double opt-in.
