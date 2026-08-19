# Staged dead-code cleanup

Refactor-only. No behaviour, UI or feature changes. Nothing in the transactional email path is touched. No database tables, columns or edge functions are deleted — only listed for review.

## Verified starting facts

- 756 TypeScript/TSX files under `src`, 48 edge functions.
- Repo-wide reference search confirms these have **zero inbound references** (each appears only in its own file): `useProposalsReactQuery`, `useOptimizedProposals`, `SubmitForReviewButtonReliable`, `ProposalInvitationTester`, `DashboardPreviewBanner`, `RecentProjectsNew`, `SimplifiedHeroSection`, `useAuthReliability`, `useOptimizedAuthReliability`, `useAuthStateSync`, `useRoleSync`, `CO2OffsetChart`, `RevenueChart`, `DealStatusChart`, `src/components/home/PreviewBanner.tsx`.
- `DashboardCalculator` is live (used by `DashboardService`) and is a thin pass-through to `OptimizedDashboardCalculator` — both stay, they are not an orphan pair.
- `src/hooks/auth/useAuthState.ts` is referenced only by `useAuthStateSync`, which is itself unreferenced — the pair falls together.
- `errorBoundaryHelpers` (both `.ts` and `.tsx`) has no importers at all — needs the extra check that neither registers a side effect on import.

## Verification method used before every deletion

For each candidate, search the whole repo (`src`, `supabase/functions`, `index.html`, config, docs) for: the symbol name, the file basename, string-literal imports, `React.lazy` paths, route paths, `functions.invoke('name')`, `.rpc('name')`, and Tailwind safelist entries. Anything with a hit outside its own file and its own test is kept. Anything that runs code at module scope (global handlers, listeners, monkey-patching) is kept and flagged, even if unimported.

## Stages (one commit each, build + typecheck + tests green before moving on)

1. **Orphaned tests and test scaffolding** — `services/__tests__/runTests.ts`, tests whose only subject is a file removed later in this plan.
2. **Preview / demo / mockup components** — `DashboardPreviewBanner`, `home/PreviewBanner`, `RecentProjectsNew`, `ProposalInvitationTester`, `SimplifiedHeroSection`, `SimplifiedTestimonialsSection`, after confirming no route or feature flag renders them.
3. **Duplicate service layers** — resolve each competing pair in `services/dashboard/*`, `services/unified/*`, `services/proposal/*`, `services/proposals/*`, plus `useProposalsReactQuery` vs `useOptimizedProposals`, `SubmitForReviewButton` vs `…Reliable`, `errorBoundaryHelpers.ts` vs `.tsx`. Remove only the proven-orphan half; where both are live, both stay.
4. **Security / performance / reliability scaffolding** — `lib/performance/*`, `lib/reliability/*`, `lib/security/audit.ts`, `services/security/SecurityAudit.ts`, `components/security/SecurityStatus.tsx`, `hooks/useSecurity.ts`. Note: `SecurityAudit` is referenced from `services/unified/UnifiedDataService.ts` and `lib/config/index.ts`, so this cluster is partly live — only the genuinely detached parts go.
5. **Dead exports, dead branches, stray console statements** inside files that stay. Mechanical only.
6. **Unused npm dependencies** — removed only when nothing in `src`, `supabase/functions`, build config or CI imports them.
7. **Auth infrastructure (last, isolated)** — `hooks/auth/authCache.ts`, `useAuthReliability`, `useOptimizedAuthReliability`, `useAuthState`, `useAuthStateSync`, `useRoleSync`. Extra pass over `AuthContext`, `App.tsx`, route guards and layouts first; then a manual sign-in/refresh/sign-out check before the commit is kept.

## Deliberately kept and flagged, not deleted

- All shadcn/ui primitives (carousel, command, context-menu, drawer, hover-card, menubar, navigation-menu, resizable, toggle, toggle-group, breadcrumb) and their Radix dependencies.
- The whole `components/ui/chart/*` tree and the dashboard chart components (`CO2OffsetChart`, `RevenueChart`, `DealStatusChart`, `PieChartContent`, `CustomPieLabel`, `ChartEmptyState`, `ChartLoadingState`, `StatusColors`) — the client dashboard work makes these likely to be needed again.
- Every edge function, database table, column, view, trigger and RLS policy.
- Environment variables and secret references.

## Regression check before the report

Sign up / sign in / sign out / password reset / refresh persistence; all four roles reaching the right dashboard and nav; proposal create → submit for review → admin approve → client invitation email; project onboarding including vintage/audit transitions; super partner module and partner API; weekly roundup email; transactional emails and `resend-webhook` event recording; public site, calculator and lead forms.

## Report at the end

Deleted (by stage, one-line reason each) · Flagged not deleted (with risk and recommendation) · Duplicate pairs resolved (which is live, how it was proven) · Uncertain (what a human must check) · Metrics (file count and bundle size before vs after) · Improvements noticed but not made.

## Improvements noticed but not made

- **Bundle size (29.0 MB build output) — separate performance pass required.** Unchanged by this cleanup, as expected (all removals were already tree-shaken). 29 MB is far above normal for a Vite/React app; likely causes are unoptimised static assets (raw PNG/video in `src/assets` and `public`) and/or a heavy dependency graph (recharts, framer-motion, mapbox, xlsx, pdf tooling). Needs its own audit with `rollup-plugin-visualizer`, asset compression, and route-level code splitting. Not part of the dead-code work.

## Amendments (agreed 2026-08-19)

- Clean revert point: commit `8174b649` (plan archived, immediately before stage 1). Baseline: 1291 tracked files repo-wide / 768 under `src`. Current HEAD: 1137 / 625.
- Orphaned tests are deleted in the same commit as their subject, never ahead of it.
- Stage 5 is deletions only: no rewrites, renames or signature changes. Anything requiring a change beyond the export line is flagged, not done.
- Error-handling modules require an explicit dependency check (ErrorBoundary components, `window.onerror`, `unhandledrejection`) before removal; zero importers alone is not sufficient evidence.
