
# Regression Test Plan — Post Sales-Agent Removal

Goal: verify no remaining feature was broken by the Cora/Sales-Agent teardown. Combine automated checks with a targeted manual/browser smoke test across the surviving surfaces.

## 1. Static & build verification
- Run TypeScript build (Vite) to catch any orphan imports from deleted modules (`cora`, `sales-agent`, `useCoraSignals`, outreach dialogs, deleted edge functions, dropped tables in `types.ts`).
- Run ESLint on `src/`.
- Re-grep codebase for: `cora`, `sales_agent`, `discovery_candidate`, `outreach_`, `send-cold-outreach`, `OutreachHistory`, `ResearchLeads`, `SendOutreach`, `lead_outreach_history`, `score_history`, `coraGuard`, `outlookSend` — expect zero hits outside migration files.

## 2. Automated test suites
- Run Vitest: `bunx vitest run` (covers `src/**/*.{test,spec}.{ts,tsx}` incl. ProposalTransformer, DashboardCalculator, ProfileService, validation schemas).
- Run Supabase edge-function Deno tests for surviving functions (`supabase--test_edge_functions` with no filter).
- Run `supabase--linter` to confirm DB is clean after the teardown migration (no orphan policies/views referencing dropped tables, RLS still enabled everywhere).
- Run `security--run_security_scan` for a backend posture check.

## 3. Browser smoke test (preview, logged in as admin then agent then client)
Use `browser--navigate_to_sandbox` + observe/act. For each route: load, check console for errors, check primary network calls return 200, exercise one core interaction.

Admin surfaces
- `/admin/dashboard` — metrics, vintage revenue breakdown, closeout queue, pending agent approvals, portfolio review clusters, learning metrics.
- `/admin/agents` — Leads tab: add lead, edit lead, bulk import (open dialog only), convert lead. Confirm Research/Outreach/History buttons are gone.
- `/admin/companies`, `/admin/users`, `/admin/legal-documents`, `/admin/knowledge-hub`, `/admin/system-settings`.
- Proposal list, open one proposal, send invitation (use ProposalInvitationTester or live flow on a test proposal), approve/reject path.

Agent surfaces
- `/dashboard` — agent warm cards, vintage revenue, referral stats, "Proposals worth a personal nudge" table.
- Create proposal flow end-to-end (calculator → proposal draft → save → preview → send invitation).
- Client management: search, create client, view client details.

Client surfaces
- `/proposals/view/:token` via invitation link — verify load, approve flow, sign-in prompt.
- Client dashboard, project agreement.

Auth
- Sign in / sign out / inactivity logout / role redirect / register form / invitation token landing.

## 4. Cross-cutting checks
- Realtime subscriptions (`agentSubscriptions`, `proposalSubscriptions`, `notificationSubscriptions`) connect without errors in console.
- Cron jobs remaining (`SELECT * FROM cron.job`) — confirm only non-sales-agent jobs survive and no scheduled job references a deleted function.
- Edge function logs: spot-check the most-used surviving functions for recent errors (`send-proposal-invitation`, any auth/profile functions).
- Sidebar nav renders without the removed Sales Agent entry; no 404s on direct nav.

## 5. Reporting
Produce a single regression report listing, per area: ✅ pass / ⚠️ warning / ❌ fail, with reproduction notes and console/network excerpts for any failure. Stop and surface failures for triage before any further changes.

## Technical notes
- Tests run from `/dev-server`. Vitest config already present (`vitest.config.ts`).
- Browser tool will need the user to be signed in for protected routes; if a login wall is hit, pause and ask the user to sign in in the preview.
- No code changes are part of this task — any bug found will be filed back as a separate fix request.
