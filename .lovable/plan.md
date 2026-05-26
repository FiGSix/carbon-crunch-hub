# Phase 3 (revised) — MS Bookings link instead of custom Azure app

Switch the meeting flow from "build our own booking page on Shaun's calendar via Graph" to "hand the lead Shaun's existing **Microsoft Bookings** page." This removes all calendar/Teams API work, no Azure app registration, no `Calendars.ReadWrite` / `OnlineMeetings.ReadWrite` scopes, no free/busy logic, no slot grid.

Outlook connector (already connected) continues to handle inbound + outbound email only.

---

## 1. What changes vs the previous plan

**Removed**
- Custom Azure App Registration (`MS_CLIENT_ID/SECRET/TENANT_ID/REFRESH_TOKEN`)
- `get-available-slots` edge function
- `book-meeting` edge function
- `/book/:token` public route, `MeetingBookingPage.tsx`, `SlotPicker.tsx`
- `meeting_booking_tokens` table
- All Tue/Thu × 08:30–15:30 × 30-min slot-grid logic in code
- `meeting_days`, `meeting_window_*`, `meeting_duration_min`, `meeting_horizon_days`, `meeting_lead_time_minutes` settings columns

**Kept / changed**
- All §1 (Outlook inbound + AI auto-reply), §3 (re-score), §4 (email notifications), §5 (notes) unchanged.
- §2 (meetings) becomes a thin wrapper around the MS Bookings link.

Note: the booking rules (Tue/Thu, 30 min, 08:30–15:30) are now enforced by **MS Bookings itself** on Shaun's side — not by our code. Make sure his Bookings service is configured that way; we won't validate it.

---

## 2. Meetings via MS Bookings

```text
AI draft reply (intent = interested)
   embeds the Bookings link
   https://outlook.office.com/bookwithme/user/9d260efd86dd40d586655ba9b9a3b4c1@crunchcarbon.com/meetingtype/NFYHu93970W7f_fhSJejcg2?anonymous&ismsaljsauthenabled&ep=mlink
              │
Lead books on MS Bookings (outside our app)
              │
MS Bookings sends Shaun + lead a confirmation email; Teams join link is in that email
              │
poll-inbound sees the confirmation in Shaun's mailbox
   → sales-agent-classify-reply detects intent = 'meeting_booked'
   → mark enrollment + lead.status = 'meeting_booked'
   → insert meetings row (scheduled_at parsed from email, teams_join_url extracted)
   → candidate_notes (system event)
   → email digest to shaun@
```

**Schema (simplified)**
- `meetings` — lead_id, enrollment_id, scheduled_at, teams_join_url (nullable), source ('ms_bookings'), raw_confirmation_message_id, status (`scheduled`|`held`|`no_show`|`cancelled`).
- `sales_agent_settings` add:
  - `bookings_url text default 'https://outlook.office.com/bookwithme/user/9d260efd86dd40d586655ba9b9a3b4c1@crunchcarbon.com/meetingtype/NFYHu93970W7f_fhSJejcg2?anonymous&ismsaljsauthenabled&ep=mlink'`
  - `bookings_cta_label text default 'Pick a 30-min slot with Shaun'`
  - `meeting_timezone text default 'Africa/Johannesburg'` (display only)

**Intent classifier update**
`sales-agent-classify-reply` gets a new intent value `meeting_booked` plus a small heuristic on top of the AI call: subject starts with `New booking:` / `Booking confirmation` AND sender domain is `microsoft.com` / `bookings.microsoft.com` → force-classify. Extract:
- `scheduled_at` from the email body
- Teams `joinUrl` via regex on `https://teams.microsoft.com/l/meetup-join/...`
- Lead email from attendee line; match to existing enrollment.

**Manual fallback**
Admin can also click "Mark meeting booked" in the candidate drawer and paste date/time + join URL, in case the auto-parse misses one.

---

## 3. Frontend changes (only what's different from the previous plan)

- `SettingsTab.tsx` → new "Meetings (MS Bookings)" card: editable `bookings_url`, `bookings_cta_label`, timezone. "Open Bookings page" button.
- `EditCandidateDialog.tsx` + Pipeline drawer → "Mark meeting booked" manual form (date/time + Teams URL).
- `MeetingsList.tsx` → unchanged; shows scheduled_at + Teams link.
- AI reply templates → use `{{bookings_url}}` token rendered as a CTA button.
- **No** `/book/:token` route, **no** slot picker.

---

## 4. Edge functions (final list)

| Function | Purpose | Trigger |
|---|---|---|
| `sales-agent-send` (update) | Outlook `/me/sendMail`, injects `bookings_url` | app / cron |
| `poll-inbound` | Pull Outlook messages | cron 5 min |
| `sales-agent-classify-reply` | AI + Bookings-confirmation heuristic | invoked |
| `sales-agent-draft-reply` | AI reply with Bookings CTA | invoked |
| `sales-agent-rescore` | Bulk re-score pending | admin |
| `sales-agent-notify` | Email alerts + daily digest | cron 15 min |

Removed: `get-available-slots`, `book-meeting`, `meeting-reminder` (MS Bookings sends its own reminders).

---

## 5. Integrations & secrets

- **Microsoft Outlook connector** — already connected (`Mail.Send`, `Mail.Read`). Nothing more needed.
- **Lovable Emails** — transactional alerts/digests.
- **Lovable AI Gateway** — `LOVABLE_API_KEY` for classify + draft.
- **No Azure App Registration. No Slack. No Resend. No Cal.com. No Google.**

---

## 6. Trade-offs to be aware of

1. We can't show free/busy in our UI — leads see availability only on MS Bookings.
2. If a lead books but Shaun's mailbox doesn't receive the confirmation (filter/rule), we won't know. Mitigation: weekly reconcile prompt in the daily digest ("Any meetings booked this week not showing here?") + the manual "Mark meeting booked" form.
3. Cancellations/reschedules from MS Bookings must also be parsed from email (subject `Updated:` / `Canceled:`); add to classifier in same change.
4. Booking rules (Tue/Thu, 30 min, 08:30–15:30) live in MS Bookings UI, not in our DB. Confirm with Shaun that his Bookings service is configured that way.

---

## Open items to confirm

1. Confirm Shaun's MS Bookings service is already set to **30-min slots, Tue & Thu, 08:30–15:30**? If not, he configures that in MS Bookings — not our code.
2. `autopilot_replies` default `false` (Shaun reviews every AI draft) or auto-send above 85% confidence?
3. Outlook polling every **5 min** to start (simple), upgrade to Graph subscriptions later if latency matters — OK?
