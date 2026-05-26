# Phase 3 — Two-way Conversations, Teams Meetings, Re-scoring, Email Notifications, Notes

Adds: inbound reply parsing + AI auto-reply, **Microsoft Teams** meeting booking via Outlook on **shaun@crunchcarbon.com**, candidate re-scoring after edits, **email-only** notifications (no Slack), and per-candidate notes threads.

Booking constraints (hard rules): **30 min slots, Tuesdays & Thursdays only, 08:30–15:30** (last start 15:00).

---

## 1. Inbound reply parsing + AI auto-reply (Outlook mailbox)

Single identity: **shaun@crunchcarbon.com**. Outbound and inbound both go through the **Microsoft Outlook connector** — no Resend inbound, no custom subdomain.

```text
sales-agent-send ──► Outlook /me/sendMail  (from shaun@crunchcarbon.com)
                       │  store internetMessageId + conversationId on enrollment
                       ▼
poll-inbound (pg_cron, every 5 min)
   GET /me/messages?$filter=receivedDateTime gt {last_poll}
                       │
   match reply → enrollment via conversationId / In-Reply-To header
                       │
                       ▼
   inbound_messages (raw)
         │
         ▼
   sales-agent-classify-reply (Lovable AI Gateway → gemini-3-flash)
         │  intent: interested | not_interested | question | bounce | ooo | unsubscribe
         ├─► update outreach_enrollments.status + agent_leads.status
         ├─► candidate_notes (kind='inbound')
         └─► if autopilot_replies AND intent ∈ (interested, question)
              AND confidence ≥ threshold
                 → sales-agent-draft-reply (AI + booking link from §2)
                 → POST /me/messages/{id}/reply via Outlook
                 → outreach_replies (status='sent', authored_by='ai')
```

**Schema**
- `inbound_messages` — enrollment_id, lead_id, graph_message_id, conversation_id, from_email, subject, body_text, body_html, headers jsonb, intent, confidence, received_at.
- `outreach_replies` — enrollment_id, lead_id, draft_body, sent_body, status (`draft`|`sent`|`discarded`), authored_by (`ai`|`admin`), graph_message_id, sent_at, reviewed_by.
- `sales_agent_settings` add: `mailbox_address text default 'shaun@crunchcarbon.com'`, `autopilot_replies bool default false`, `reply_confidence_threshold int default 80`, `last_inbound_poll_at timestamptz`.

**Edge functions**
- `poll-inbound` (cron 5 min) — dedupes by `graph_message_id`.
- `sales-agent-classify-reply` — AI intent classification.
- `sales-agent-draft-reply` — AI reply with embedded `/book/{token}` link.
- `sales-agent-send` (update) — switch from Resend to Outlook `/me/sendMail`, stash threading headers.

---

## 2. Meeting booking — Microsoft Teams via Outlook

No Cal.com, no Google. Bookings create **Teams meetings on Shaun's Outlook calendar**.

**Booking rules (enforced server-side in `get-available-slots`)**
- Duration: **30 min**
- Days: **Tuesday & Thursday only** (ISO 2 & 4)
- Window: **08:30 – 15:30** (Africa/Johannesburg)
- Slot grid: 08:30, 09:00, 09:30 … 15:00 (last start = 15:00 so meeting ends ≤ 15:30) → **14 slots/day**
- Skip slots overlapping `busy` blocks from `/me/calendar/getSchedule`
- Min lead time: 2h from now; horizon: 21 days

```text
AI draft reply (intent=interested) embeds: https://crunchcarbon.com/book/{lead_token}
                       │
Lead opens /book/{token} (public, token-gated)
                       │
get-available-slots
   └─ /me/calendar/getSchedule next 21 days
   └─ filter Tue/Thu, 08:30–15:30, 30-min grid, remove busy
                       │
Lead picks slot → book-meeting
   └─ re-validate slot
   └─ POST /me/events
        { isOnlineMeeting: true,
          onlineMeetingProvider: 'teamsForBusiness',
          attendees: [lead.email],
          start, end (+30m) }
   └─ store event.onlineMeeting.joinUrl
   └─ insert meetings row → lead.status='meeting_booked'
   └─ confirmation email to lead + notification to shaun@
```

**Schema**
- `meetings` — lead_id, enrollment_id, scheduled_at, duration_min default 30, graph_event_id, teams_join_url, status (`scheduled`|`held`|`no_show`|`cancelled`).
- `meeting_booking_tokens` — token, lead_id, expires_at (30d), used_meeting_id.
- `sales_agent_settings` add: `meeting_timezone text default 'Africa/Johannesburg'`, `meeting_duration_min int default 30`, `meeting_days int[] default '{2,4}'`, `meeting_window_start time default '08:30'`, `meeting_window_end time default '15:30'`, `meeting_horizon_days int default 21`, `meeting_lead_time_minutes int default 120`.

**Edge functions**
- `get-available-slots` (public, token-gated)
- `book-meeting` (public, token-gated, creates Teams event)
- `meeting-reminder` (cron daily, 24h reminder email)

**Frontend**
- Public route `/book/:token` — `MeetingBookingPage.tsx`, `SlotPicker.tsx` (week grid with only Tue & Thu columns × 14 rows).
- Settings tab: read-only "Booking rules" card (Tue & Thu, 08:30–15:30, 30 min), editable timezone.
- Pipeline: new `meeting_booked` stage, drawer shows Teams join link.
- Funnel: add **Meetings** column.

**Integration**
- **Microsoft Outlook connector** (gateway-managed) provides Mail.Send, Mail.Read, Calendars.ReadWrite, OnlineMeetings.ReadWrite via the same `/me/...` endpoints. Shaun authorizes with his account.

---

## 3. Re-score candidates after enrichment changes

- `compute_candidate_score(_candidate_id uuid) returns int` — SQL function as single source of truth (mirrors current TS scoring: email 35, website 20, phone 15, contact 15, rich notes 15).
- Trigger `discovery_candidates_rescore_trg` BEFORE UPDATE on email/phone/contact/website/enrichment/location → recompute + log to `score_history`.
- `score_history` — candidate_id, old_score, new_score, reason (`edit`|`enrichment`|`manual`), changed_by.
- `rescore_pending_candidates()` RPC + **"Re-score all pending"** button in Settings.
- After re-score: if `score ≥ threshold` AND `autopilot_discovery` AND `status='pending'` → auto-promote (forward-only).
- Approval Queue row shows ▲/▼ delta chip when score changed in last 24h.

---

## 4. Email notifications (no Slack)

All alerts to **shaun@crunchcarbon.com** via existing transactional email infra.

**Settings (new "Notifications" section)**
- `notify_enabled bool default true`
- `notify_email text default 'shaun@crunchcarbon.com'` (editable, supports extra CCs)
- `notify_pending_threshold int default 10` — approval queue size
- `notify_inbox_threshold int default 5` — unhandled inbound
- `notify_stuck_hours int default 72` — enrollments with no reply
- `notify_quiet_hours jsonb` — `{ start:'18:00', end:'07:00', tz:'Africa/Johannesburg' }`
- `notify_min_interval_hours int default 6` — per-event debounce
- `notify_daily_digest bool default true` — single 08:00 summary regardless of thresholds

**Edge fn** `sales-agent-notify` (cron every 15 min) checks pending count, unhandled inbound, stuck enrollments, new meetings. Debounced via `notification_state(event_key, last_sent_at, last_count)`. Sends via `send-transactional-email` with new templates:
- `sales-agent-pending-alert`
- `sales-agent-inbox-alert`
- `sales-agent-meeting-booked`
- `sales-agent-daily-digest`

Each email deep-links into the right admin tab.

---

## 5. Per-candidate notes / comments thread

- `candidate_notes` — candidate_id (nullable), lead_id (nullable), author_id, author_role (`admin`|`ai`|`system`|`inbound`), kind (`comment`|`inbound`|`outbound`|`system_event`), body, created_at.
- Notes persist across promotion (`promote_discovery_candidate` stamps `lead_id`).
- `CandidateNotesPanel.tsx` reused in EditCandidateDialog, Pipeline drawer, Inbox thread.
- `@admin` mentions → in-app + email notification to that admin.
- System auto-notes: "Auto-promoted at score 78", "Reply received (intent: interested)", "Teams meeting booked Tue 18 Mar 09:00", etc.

---

## Database summary

```sql
-- §1 Inbound + Outlook
create table public.inbound_messages (...);
create table public.outreach_replies (...);
alter table public.sales_agent_settings
  add column mailbox_address text default 'shaun@crunchcarbon.com',
  add column autopilot_replies bool default false,
  add column reply_confidence_threshold int default 80,
  add column last_inbound_poll_at timestamptz;

-- §2 Teams meetings
create table public.meetings (...);
create table public.meeting_booking_tokens (...);
alter table public.sales_agent_settings
  add column meeting_timezone text default 'Africa/Johannesburg',
  add column meeting_duration_min int default 30,
  add column meeting_days int[] default '{2,4}',
  add column meeting_window_start time default '08:30',
  add column meeting_window_end time default '15:30',
  add column meeting_horizon_days int default 21,
  add column meeting_lead_time_minutes int default 120;

-- §3 Re-score
create function public.compute_candidate_score(uuid) returns int ...;
create table public.score_history (...);
create trigger discovery_candidates_rescore_trg ...;
create function public.rescore_pending_candidates() returns table(...) ...;

-- §4 Email notifications
alter table public.sales_agent_settings
  add column notify_enabled bool default true,
  add column notify_email text default 'shaun@crunchcarbon.com',
  add column notify_pending_threshold int default 10,
  add column notify_inbox_threshold int default 5,
  add column notify_stuck_hours int default 72,
  add column notify_quiet_hours jsonb,
  add column notify_min_interval_hours int default 6,
  add column notify_daily_digest bool default true;
create table public.notification_state (...);

-- §5 Notes
create table public.candidate_notes (...);
```

All admin-only RLS + service_role.

## Edge functions

| Function | Purpose | Trigger |
|---|---|---|
| `sales-agent-send` (update) | Send via Outlook `/me/sendMail` | App / cron |
| `poll-inbound` | Pull Outlook messages, classify | cron 5 min |
| `sales-agent-classify-reply` | AI intent classification | invoked |
| `sales-agent-draft-reply` | AI reply + booking link | invoked |
| `get-available-slots` | Compute Tue/Thu 30-min slots | public, token |
| `book-meeting` | Create Teams event on Shaun's calendar | public, token |
| `meeting-reminder` | 24h reminder email | cron daily |
| `sales-agent-rescore` | Bulk re-score pending | admin |
| `sales-agent-notify` | Email alerts + daily digest | cron 15 min |

## Frontend

- New **Inbox** tab: `InboxTab.tsx`, `ConversationThread.tsx`, `ReplyDraftCard.tsx`.
- New public route `/book/:token`: `MeetingBookingPage.tsx`, `SlotPicker.tsx`.
- New components: `CandidateNotesPanel.tsx`, `MentionInput.tsx`, `ScoreHistorySparkline.tsx`, `MeetingsList.tsx`.
- Updates: `SettingsTab.tsx` (+ Notifications, Booking rules, Mailbox, Autopilot replies), `FunnelScoreboard.tsx` (+ Replies, + Meetings), `PipelineTab.tsx` (+ `meeting_booked` stage, Teams link), `EditCandidateDialog.tsx` (notes), `ApprovalQueueTab.tsx` (score delta chip).

## Integrations & secrets

- **Microsoft Outlook connector** (gateway) — Shaun authorizes with `shaun@crunchcarbon.com`. Scopes: `Mail.Send`, `Mail.Read`, `Calendars.ReadWrite`, `OnlineMeetings.ReadWrite`. Same `/me/...` calls cover mail, calendar, getSchedule, and Teams online meeting creation.
- **Lovable Emails** — transactional alerts/digests/booking confirmations (already configured).
- **Lovable AI Gateway** — `LOVABLE_API_KEY` for classify + draft.
- **No Slack. No Resend inbound. No Cal.com. No Google.**

## Out of scope (Phase 4)
- Multi-language reply drafting
- A/B sequence copy testing
- Third-party enrichment (Clearbit/Apollo)
- Round-robin to multiple reps
- Lead self-reschedule UI (v1: Shaun reschedules in Outlook directly)

## Open items to confirm
1. Timezone **Africa/Johannesburg (UTC+2)** for the booking window — correct?
2. `autopilot_replies` default `false` (Shaun reviews every AI draft) or auto-send above 85% confidence?
3. Outlook **polling every 5 min** (simple) vs Graph subscriptions (lower latency, needs renewal) — start with polling?
4. Confirm the Outlook connector authorizes against Shaun's mailbox specifically (not a shared mailbox).
