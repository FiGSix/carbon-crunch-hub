
# Declutter the Agent Dashboard

Agents currently land on a dense page: a big "Proposals worth a personal nudge" grid (8 cards), Portfolio review (6 rows), Close-out queue (8 rows), the full Learning dashboard, the top-row placeholders, plus the metrics-by-stage cards. Too much, all at once.

## Goals

- Focus the agent's attention on the next 3–5 actions they should take today.
- Move analytics out of the agent's daily view.
- Keep all existing functionality reachable — just less of it on the dashboard surface.

## Changes

### 1. Learning Dashboard → admin only
Today both agents and admins see it. Agents rarely act on aggregate KPIs (median time-to-sign, stale rate, pipeline by bucket). Restrict it to `userRole === "admin"` in `Dashboard.tsx`. No data loss — admins still get the full view, and we can later add a personal "your numbers" card for agents if needed.

### 2. Trim the three action lists to the top 5
- **Proposals worth a personal nudge** — show top 5 (was 8). Hook already ranked by signal × value, so the top 5 are the highest-leverage. Add a small "View all" link to `/proposals?filter=warm` (or similar) for the rest.
- **Portfolio review** — show top 4 (was 6).
- **Close-out queue** — show top 5 (was 8).

Each section keeps a "Show more" / "View all" affordance so nothing is lost — just deferred.

### 3. Reorder for a calmer flow
New agent dashboard order:

```text
1. Header + pending-approval alert (unchanged)
2. Proposals worth a personal nudge   ← single most actionable section, full width
3. Two-column row:
     • Portfolio review     • Close-out queue
4. Top row (Vintage progress, audit reviews, revenue, blend pipeline)
5. Metrics-by-stage cards (collapsed under a "Pipeline metrics" heading)
```

The current layout puts the warm cards in a 2-col grid with portfolio + close-out stacked beside them, which forces the eye to bounce. Promoting warm cards to full width and dropping portfolio + close-out into a calmer secondary row reduces visual noise.

### 4. Admin layout unchanged
Admins keep everything (Learning dashboard included). Only the agent view is decluttered.

## Out of scope
- No changes to the underlying hooks, queries, or data shapes.
- No changes to the Sales Agent admin page.
- No changes to client dashboard.

## Files affected
- `src/pages/Dashboard.tsx` — gate Learning dashboard on `admin`, reorder agent sections.
- `src/components/dashboard/sections/AgentWarmCards.tsx` — accept `limit` prop (default 5), add "View all" link.
- `src/components/dashboard/sections/PortfolioReviewSection.tsx` — limit 4, add "View all".
- `src/components/dashboard/sections/CloseoutQueueSection.tsx` — limit 5, add "View all".

## Open question
"View all" links — should they point to the existing `/proposals` page with a query filter, or do you want a dedicated page per list later? For now I'll link to `/proposals` with a sensible filter and we can refine.
