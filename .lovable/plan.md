# Prevent duplicate site ownership and commission conflicts

## Confirmed findings

- Two active proposal rows represent the same client and apparent installation: **2499 Zenco Farming Brothers Off-Grid PV Starter**, **707.905 kWp**.
- Connor Gibbs created the first record on **2026-01-23**; Simon Stockil created the second on **2026-02-10**.
- Both rows point to the same client record and have the same project name, size, and displayed address. Their saved GPS pins are approximately **259 m apart**, and their commissioning dates differ (`2024-07-05` and `2024-05-07`).
- The current interactive check only treats locations within 50 m as conflicts; 259 m is merely a notice. More importantly, that check’s blocked state is not connected to the wizard’s Next/Submit controls.
- The normal proposal insert has no duplicate validation, and the database has no cross-partner site uniqueness rule. Other creation routes use different, incomplete checks.
- Each row independently assigns one partner and its commission rate. There is no mechanism for two partners to share commission on one installation, so allowing both creates a genuine ownership conflict.
- Connor’s earlier row contains the actual signed agreement. Simon’s later row appears approved because the shared client’s existing master signature was inherited; it was not separately signed by the client.

## Resolution for the existing Zenco duplicate

- Keep Connor Gibbs’s first-created proposal as the canonical project and preserve its signed agreement, onboarding data, and attribution.
- Soft-archive Simon Stockil’s later duplicate so it is excluded from active project, pipeline, MWp, revenue, and commission views while retaining an audit trail.
- Add an administrative activity/audit entry explaining that the later record was archived as a duplicate and naming the retained proposal.
- Verify the client sees only the retained project and that dashboard totals count 707.905 kWp once.

## Central duplicate protection

- Add one database-backed duplicate detection function used by every proposal creation route rather than relying on separate frontend checks.
- Compare active proposals across all partners using a weighted identity check:
  - same client plus normalized project name;
  - same client plus near-identical system size and normalized address;
  - GPS proximity, with stronger matching when client/name/size also agree;
  - exclude archived/deleted records and the proposal currently being edited.
- Treat exact/high-confidence matches as **blocked pending admin review**, regardless of which partner submits them.
- Keep lower-confidence nearby sites as warnings so legitimate separate installations on farms, malls, and multi-building properties are not automatically rejected.
- Make the database enforce the final decision atomically to prevent two simultaneous submissions bypassing a frontend pre-check.

## Admin review workflow

- Record each blocked submission in a dedicated duplicate-review queue with the submitting partner, proposed client/site details, matched proposal, match reasons, timestamp, and review status.
- Add an admin-only review surface showing both records side by side.
- Allow an admin to:
  - confirm duplicate and reject the later submission;
  - approve it as a genuinely separate installation with a required reason;
  - open the existing proposal and partner/client records for investigation.
- Log every decision and override. Partners should see a neutral message that the site is already registered or under review, without exposing another partner’s confidential details.

## Apply to every creation route

- Route normal partner UI creation, client submissions, partner API creation, bulk upload, referral creation, and legacy imports through the same detector and decision rules.
- Retain route-specific behavior only for presentation: API returns a conflict response, bulk upload marks the row as blocked/review required, and the UI prevents final submission while offering admin-review escalation.
- Replace the disconnected project-step warning state so Next and final Submit cannot proceed on a confirmed conflict.

## Commission and reporting safeguards

- Ensure blocked/review submissions do not contribute to portfolio MWp, revenue, dashboard metrics, or commission calculations.
- Preserve one commission owner per canonical proposal; do not split commission automatically.
- Add an admin exception/report for any existing active high-confidence duplicate pairs so historical collisions can be resolved deliberately.

## Validation

- Test same client/name/size with slightly different pins and dates: blocked and queued.
- Test different partners submitting the same site concurrently: only one active proposal is created.
- Test legitimate separate installations at one broad address: warning or admin-approved override works.
- Test normal UI, partner API, bulk import, referral, legacy import, and client submission paths.
- Confirm the Zenco duplicate is archived, Connor remains attributed, Simon has no active claim, the signed agreement remains available, and aggregate MWp/revenue is counted once.

## Technical details

- Database changes will include explicit grants, RLS, admin-only review policies, and auditable override fields/actions.
- Existing proposal creation logic will call a shared server-side function; client-side checks remain for early feedback but are not the security or integrity boundary.
- No automatic reassignment of commission will occur without an admin decision.
