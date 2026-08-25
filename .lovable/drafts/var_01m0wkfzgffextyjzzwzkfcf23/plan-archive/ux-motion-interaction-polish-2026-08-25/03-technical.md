## Layout: Partner dashboard at rest

The existing sections stay; only order and weight change.

```text
+--------------------------------------------------------------+
| Portfolio 26.2 MWp | Audit Ready 8.4 | Proposals 12 | Signed 3 |
+--------------------------------------------------------------+
| Since your last visit  +1.8 MWp · 2 signed · 1 Audit Ready    |
+--------------------------------------------------------------+
| HIGHEST-VALUE OPPORTUNITY                                     |
| ABC Manufacturing · 2.8 MWp · waiting 6 days   [Follow up ->] |
+--------------------------------------------------------------+
| Warm cards (existing)        | Portfolio review | Closeout    |
+--------------------------------------------------------------+
| Stage metrics (existing, quieter)                             |
+--------------------------------------------------------------+
```

## Technical notes

New shared primitives (small, reusable, no new dependencies beyond `framer-motion`, already installed):

- `src/hooks/useReducedMotion.ts` — wraps the media query; every primitive short-circuits through it.
- `src/components/motion/AnimatedNumber.tsx` — count-up on value change, ~600ms ease-out, `tabular-nums`. Generalised from the existing `solar-rewards/AnimatedCounter`.
- `src/components/motion/AnimatedProgress.tsx` — tweened wrapper over the shadcn Progress.
- `src/components/motion/StageBadge.tsx` — cross-fading status badge keyed on stage.
- `src/components/motion/MilestoneCard.tsx` + `src/hooks/useMilestones.ts` — thresholds (first signed, first Audit Ready, 10/25/50/100 MWp) derived from existing metrics; "seen" state stored per user in `localStorage` via `safeStorage`, so no schema change.
- `src/components/dashboard/DetailDrawer.tsx` — shadcn Sheet used for the proposal / project slide-overs, fed by existing hooks (`useAgentWarmCards`, `usePortfolioReviewClusters`, `useCloseoutQueue`).
- `src/components/dashboard/NextBestAction.tsx` — picks the single top-ranked item from data already fetched for the warm cards; empty state renders the "all caught up" copy.
- `src/components/dashboard/SinceLastVisit.tsx` — compares current metrics against a snapshot stored in `localStorage` at last dashboard exit; renders nothing when there is no delta.

Touched existing files: `src/pages/Dashboard.tsx` (ordering, wiring), `src/components/dashboard/sections/DashboardTopRow.tsx` and `DashboardMetricsByStageCards.tsx` (animated values, hover reveal, skeletons matching final layout), `AgentWarmCards.tsx` / `PortfolioReviewSection.tsx` / `CloseoutQueueSection.tsx` (empty-state copy, drawer entry points), plus the client-facing dashboard surface for the calmer variant.

Styling stays on semantic tokens; the Audit Ready highlight sweep and milestone treatment are added as tokenised keyframes in the styles layer rather than hardcoded colours. Toast copy is upgraded in the existing success handlers (accept proposal, document accepted, validate/mark complete, audit-ready toggle) so each names the outcome and the MWp delta.

Data and hooks are unchanged — no migration, no edge function changes, no permission changes.
