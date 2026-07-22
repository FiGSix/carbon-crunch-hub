Good call — dropping the "cap at 100" idea. The Load More pattern replaces the rows-per-page dropdown entirely, so there's no page-size cap at all. Each click fetches the next 50 rows and appends them, exactly like `/my-clients2`.

## Goal
Bring Partner Management (`/admin/agents`) in line with the My Clients UX, and add three tappable summary cards above the search bar that filter the list.

## Part A — Match the My Clients pattern

**Today**
- `PartnersTable.tsx` uses numbered pagination with a "Rows per page" dropdown, driven by RPC `get_agents_management_data(status_filter, search_term, limit_param, offset_param)`.
- The RPC only returns the current page's rows, so the footer's "total" is really the current page count.

**Change**
- Remove the numbered pagination and the "Rows per page" dropdown.
- Add a "Load More Partners" button + "Showing X of Y partners" caption underneath the table, matching `/my-clients2` (component: `LoadMoreButton` or a small local twin using the same layout).
- Page size fixed at 50, rows accumulate on Load More — no upper cap.
- Return a real `total_count` from the RPC via `COUNT(*) OVER ()` as an added column, so the caption is accurate.
- Debounce search input by 300ms (matches My Clients).
- Company dropdown stays as a client-side refinement of the rows already loaded (unchanged scope).
- Sorting stays client-side over the loaded rows (unchanged).

## Part B — Three glance cards above the search bar

```text
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Invited     │  │  Pending     │  │  Active      │
│    12        │  │    3         │  │   87         │
└──────────────┘  └──────────────┘  └──────────────┘
```

- Each card is a semantic `<button>` that sets `statusFilter` to `'invited'`, `'pending_approval'`, or `'active'`. Re-clicking the active card resets to `'all'`.
- Active card gets `ring-2 ring-primary` + `bg-primary/5` (design tokens only — no hardcoded colors).
- Counts come from a new RPC `get_agents_management_counts()` returning `{ invited, pending_approval, active, total }`. Cached via React Query; realtime invalidations refresh it.
- Skeletons while loading; never block the table.

**Status mapping** (from `statusBadge.tsx`)
- Invited → `is_invitation = true` and not expired
- Pending → `agent_status = 'pending_approval'`
- Active → `agent_status = 'active'`

## Files
- **New migration**
  - Replace `public.get_agents_management_data(...)` — same signature, adds a `total_count bigint` column. Preserve grants + security settings.
  - New `public.get_agents_management_counts()` returning the four integers. `EXECUTE` to `authenticated`; admin check inside like the sibling RPC.
- `src/components/admin/agents/PartnersTable.tsx` — swap pagination for Load More, add debounce, wire cards, consume `total_count`.
- New `src/components/admin/agents/PartnerStatsCards.tsx` — the 3 filter cards.
- `src/components/admin/agents/realtime/useAgentsRealtime.ts` — also invalidate the counts query key.
- `src/lib/queryKeys.ts` — add `queryKeys.agents.management.counts`.
- `TablePagination.tsx` is left in place (used elsewhere), just unused on this page.

## Out of scope
- Moving the Company filter server-side.
- Changes to `/admin/partner-management` (Partner API) page.

## Technical notes
- Migration is additive (new column, new function); deploy migration first, then client.
- Accessibility: `<button aria-pressed={statusFilter === value}>`, focus-visible ring from existing styles.
- Only semantic tokens for colors on the new cards.
