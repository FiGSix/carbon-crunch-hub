# Show agent's company on Warm Cards (admin only)

Mirror the Portfolio Review change on the "Proposals worth a personal nudge" section (`AgentWarmCards`). When the viewer is an admin, display the responsible agent's company under the client name.

## Changes

**`src/hooks/dashboard/useAgentWarmCards.ts`**
- Extend `WarmCard` interface with `agent_company_name: string | null`.
- After fetching engagement buckets, when `userRole === "admin"`, collect distinct `agent_id`s and run a single `profiles` query: `select id, company_name where id in (...)`.
- Build an `agentCompanyById` map and attach `agent_company_name` to each enriched card. For agents, leave as `null` (not shown).

**`src/components/dashboard/sections/AgentWarmCards.tsx`**
- Read `userRole` from `useAuth()` in `WarmCardItem` (or pass via prop from the parent).
- When `userRole === "admin"` and `card.agent_company_name` is present, render a small muted line under the proposal title: `Agent: <company_name>` (same styling pattern as `PortfolioReviewSection`).
- Agent-facing view is unchanged.

No DB schema or migration changes — `profiles.company_name` already exists. No business-logic changes; purely a display addition for admins.
