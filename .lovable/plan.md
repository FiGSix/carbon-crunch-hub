## Diagnosis

Clayton McLean (Dipula Income Fund Limited, `clayton@dipula.co.za`) **does exist** in the database:

- `clients.id = 22612042-…`, created 2025-12-18 by shaun@crunchcarbon.com
- `user_id` is `NULL` (prospect — proposal-only, never signed up)
- `client_company_id` is linked to Dipula Income Fund Limited

He is returned correctly by `get_agent_clients_paginated_admin` when queried directly. So the RPC and permissions are fine.

**Why he's invisible in the UI:**

- My Clients loads clients in pages of 50, ordered by `created_at DESC`.
- There are **375 clients newer than Clayton** (out of 543 total) — he's roughly on page 8.
- The search box in `ClientsTableContent` only filters the rows **already loaded on the client**. Typing "Clayton" or "Dipula" matches nothing because his row hasn't been fetched yet.
- Admin would need to hit "Load more" seven times before search can find him. In practice, no one does.

Same problem affects every not-recently-created client (prospects created via old proposals, dormant companies, etc.), not just Clayton.

## Fix — server-side search

Push the search query down to the database so it runs against **all** clients, not just the loaded page.

### 1. RPC changes (one migration)

Add an optional `search_param TEXT DEFAULT NULL` to both:

- `get_agent_clients_paginated_admin(agent_id_param, limit_param, offset_param, search_param)`
- `get_agent_clients_paginated(agent_id_param, limit_param, offset_param, search_param)`
- `get_agent_clients_count(agent_id_param, search_param)` — so pagination totals reflect the filter.

When `search_param` is non-null/non-empty, add a case-insensitive `WHERE` on trimmed match across `first_name`, `last_name`, `email`, and `company_name` (`ILIKE '%…%'`). Preserve existing role/agent scoping and ordering.

### 2. Fetcher + hook

- `ClientFetcher.getClients` — accept `search?: string`, pass to both RPCs, include in the cache key and dedup key so different searches don't collide.
- `UnifiedDataService.getClients` — thread `search` through.
- `useClients` — accept `search` option, refetch (debounced by caller) when it changes, reset offset to 0 on new search.

### 3. UI wiring

- `MyClients2` — lift `searchQuery` state (or add local state) and pass to `useClients({ paginated: true, pageSize: 50, search: debouncedSearch })`. Debounce ~300ms.
- `ClientsTableContent` — accept `searchQuery`/`onSearchChange` as props from parent instead of owning the state; keep the input UI and the "Found N clients matching…" line, but stop client-side filtering when a server search is active (the returned rows are already the matches). Keep client-side sort as-is.

### 4. Behaviour

- Empty search: current pagination behaviour, unchanged.
- Non-empty search: server returns all matches (still paged, but the match set is small), so Clayton / Dipula / any older client shows up immediately.
- Agent view: same mechanism, scoped to their own clients by the existing `agent_id_param` branch.

## Files touched

- `supabase/migrations/<new>.sql` — extend the three RPCs with `search_param`.
- `src/services/unified/clients/operations/ClientFetcher.ts` — accept + forward `search`, update cache/dedup keys.
- `src/services/unified/UnifiedDataService.ts` — pass `search` through.
- `src/hooks/clients/useClients.ts` — new `search` option, refetch on change, reset offset.
- `src/pages/MyClients2.tsx` — own the debounced search state, pass to hook and table.
- `src/components/clients/table/ClientsTableContent.tsx` — accept search state as props; skip client-side filter when server search is active; keep the input and result-count line.

## Out of scope

- Changing default page size or auto-loading everything for admins (server search removes the need).
- Redesigning the prospect/company visibility rules — those already work; the row just wasn't reachable.
- Search on User Management's Potential Clients tab (separate screen, separate query).
