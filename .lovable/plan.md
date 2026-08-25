# Onboarding follow-ups, activity log and comments

Goal: make it easy to chase clients and installers for missing onboarding information, see when they were last chased, and keep a real record of what changed and what was discussed.

## 1. Follow-up on the Project Onboarding list (admins only)

- New column **Last Follow-up**: shows "3 days ago" (hover for exact date, who sent it, and who it went to), or "—" if never.
- New action per row: **Send follow-up** as a small split button with a dropdown so it is still one click:
  - Client + Installer (default click)
  - Client only
  - Installer only
- Clicking sends immediately, then shows a toast: "Follow-up sent to name@example.com" — or an explanatory toast if there is nothing outstanding, or if the chosen recipient has no email on file.
- Sorting/filtering unchanged; the column just displays.
- Non-admins do not see the column or the button.

## 2. What the email contains

A short branded email (same white-header template as platform broadcasts) that says the project still needs a few items, then a tidy checklist of only the items actually outstanding, grouped as:

- System details (e.g. commissioning date, ownership type, meter type, GPS location)
- Equipment (inverter, panel, battery details)
- Documents (Certificate of Compliance, invoices, calibration certificate where a dedicated meter is used)
- Monitoring / data access (portal credentials or site ID not verified)

Below the checklist:

- A **Open my project** button that lands on the Onboarding form tab.
- If an admin has left comments on the project, a highlighted callout: "Your Crunch Carbon team has left N notes on this project" with a **View comments** link to the Activity & Comments tab.
- Plain footer with reply-to going to the platform mailbox.

Outstanding items are computed on the server from the actual saved records, using the same rules the Onboarding tab uses to turn sections green — so the email can never contradict the UI.

## 3. Real activity log

Currently almost nothing is written to the activity log, so the tab looks empty. This will:

- Record events automatically in the database whenever onboarding data changes: field edits (which field, old value → new value), document uploads and replacements, data-access configuration changes and test results, submitted for review, admin validation, audit-ready toggled, and follow-up emails sent (including recipients).
- Render them in the Activity & Comments tab as a readable timeline: who, what changed, when, with old → new values where relevant.

## 4. Working comments section

- Post a comment, see the thread newest-first with author name and timestamp, and reply to an existing comment.
- Admin comments are visible to the client and partner on the project, so the "we've left you notes" email link is meaningful.
- Comment count badge on the Activity & Comments tab, plus a small callout at the top of the Onboarding tab ("2 notes from the Crunch Carbon team") linking to the tab — this is what the email deep-links to.

## Technical notes

**Migration**
- `project_onboarding`: add `last_followup_at timestamptz`, `last_followup_by uuid`, `last_followup_recipients text[]`.
- Triggers writing to `onboarding_activity_log`: `AFTER UPDATE ON onboarding_fields` (per-column diff of the meaningful columns, one row per changed field), `AFTER INSERT/UPDATE ON onboarding_documents`, `AFTER INSERT/UPDATE ON data_access_config`, and `AFTER UPDATE ON project_onboarding` for `submitted_for_review` / `admin_validated` / `audit_ready` / `onboarding_complete` / `data_access_verified`. Triggers use `auth.uid()` for `actor_id`, falling back to `last_modified_by`.
- Review RLS on `onboarding_activity_log` and `onboarding_comments` so project stakeholders (admin, owning agent/team, client and their company members) can read, and authenticated stakeholders can insert comments. Reuse `is_project_stakeholder`.

**Shared outstanding-items rules**
- Extract the completion rules currently inline in `OnboardingTab.getSectionCompletionInfo` into `supabase/functions/_shared/onboarding-outstanding.ts`, returning `{ group, label }[]` from `onboarding_fields`, `onboarding_documents`, `data_access_config` and `project_onboarding` rows. Mirror it for the frontend where needed rather than duplicating rules by hand.

**Edge function `send-onboarding-followup`**
- Input: `{ projectId, recipients: 'both' | 'client' | 'installer' }`, validated with Zod; verifies the caller's JWT and admin role via `has_role` before doing anything.
- Loads project + proposal + client + `onboarding_fields.installer_email`, computes outstanding items, returns `{ sent: false, reason: 'nothing_outstanding' | 'no_email' }` when applicable.
- Renders HTML with a new `_shared/onboarding-followup-template.ts` built on the existing broadcast template helpers, sends via Resend, respects `client_email_suppressions` for the client address.
- On success: updates the three `last_followup_*` columns and inserts an `onboarding_activity_log` row.

**Frontend**
- `src/pages/ProjectOnboardingList.tsx`: select the new columns, add the Last Follow-up column and the split-button action (DropdownMenu + Button), admin-gated, with per-row sending state and optimistic refresh.
- `src/pages/ProjectOnboardingDetail/ActivityCommentsTab.tsx`: replace both placeholders with real activity timeline and comment thread; new hooks `src/hooks/onboarding/useOnboardingActivity.ts` and `useOnboardingComments.ts`.
- `src/pages/ProjectOnboardingDetail/index.tsx`: comment count on the tab label, support `?tab=activity` deep link.
- `src/pages/ProjectOnboardingDetail/OnboardingTab.tsx`: small notes callout linking to the activity tab.

Out of scope for now: automatic scheduled reminders, bulk follow-up to all filtered projects, @mention notifications.
