# Show agent's company on Portfolio Review cards (admin only)

In the admin dashboard's "Portfolio review — multiple unsigned proposals, worth a personal touch" section, display which company the responsible agent belongs to.

## Changes

**`src/hooks/dashboard/usePortfolioReviewClusters.ts`**
- After fetching `portfolio_reminder_candidates`, collect distinct `agent_id`s and run a single follow-up `profiles` query: `select id, company_name where id in (...)`.
- Attach `agent_company_name: string | null` to each returned cluster.
- Extend the `PortfolioReviewCluster` interface with `agent_company_name`.

**`src/components/dashboard/sections/PortfolioReviewSection.tsx`**
- Import `useAuth` (already imported) and read `userRole`.
- In `ClusterRow`, when `userRole === 'admin'` and `cluster.agent_company_name` is present, render a small muted line under the client name: `Agent: <company_name>` (or a `Badge` next to the unsigned-count badge — pick badge style to match existing chips).
- Agents continue to see exactly what they see today (no extra line).

No DB schema or migration changes; `profiles.company_name` already exists. No changes to the agent-facing surface.
