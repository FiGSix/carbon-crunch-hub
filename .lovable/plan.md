

# Fix: Page Freezing After Edits on Clients, Users, and Agents Pages

## Root Cause Analysis

The freeze pattern is a **mutation → realtime echo → cascading invalidation loop**. Here is how it works on each page:

### Agents Page
1. Admin updates an agent (status, commission, etc.) via mutation
2. Mutation `onSuccess` calls `invalidateAgentManagement()` — this is debounced (1s timer that fires async and returns immediately)
3. The `await invalidateAgentManagement()` in `onSuccess` resolves instantly (the debounce means the actual invalidation hasn't happened yet)
4. The database UPDATE triggers a `postgres_changes` event on the `profiles` table
5. `useAgentsRealtime` receives the event and calls `invalidateAgentManagement()` again
6. This triggers a refetch, which may itself fire another activity log write → another realtime event → another invalidation
7. The 1-second debounce in `invalidateAgentManagement` only slows the loop, it doesn't break it

### Users Page
1. Admin changes a role or deletes a user → `onSuccess` calls `refetch()` or `queryClient.invalidateQueries(['admin-users'])`
2. The refetch runs 5+ sequential Supabase queries (profiles, company_members, client_company_members, companies, client_companies, unlinked clients)
3. The `all-companies-filter` query (line 235) has **no `staleTime` or `refetchOnWindowFocus`**, so it also re-runs freely
4. If the user switches tabs during loading, `refetchOnWindowFocus` (default: true on the companies query) triggers yet another refetch
5. No realtime subscription here, but the sheer query volume blocks the main thread

### Clients Page
1. The `useClients` hook has a manual `fetchClients` function with `isFetchingRef` guard — this is actually well-protected
2. However, the `useRealtimeSubscription` hook subscribes to ALL `proposals` table changes (for admins, no filter)
3. Any proposal change anywhere in the system triggers `onDataChange()` → `refresh()` → clears cache → full refetch
4. If an admin edits a client that also affects a proposal, this creates a cascade

## Fixes

### 1. `src/hooks/query/useCacheInvalidation.ts` — Add mutation cooldown tracking

Add a module-level `lastMutationTimestamp` map so realtime handlers can detect "echoes" from local mutations and skip redundant invalidations.

```typescript
// Module-level: tracks when explicit mutations triggered invalidation
export const mutationCooldowns = new Map<string, number>();
const COOLDOWN_MS = 3000;

export function isInCooldown(key: string): boolean {
  const lastMutation = mutationCooldowns.get(key);
  if (!lastMutation) return false;
  return Date.now() - lastMutation < COOLDOWN_MS;
}
```

Update `invalidateAgentManagement` to:
- Record `Date.now()` in `mutationCooldowns` when called
- Execute invalidation immediately (remove the debounce for explicit calls) so the `await` in `onSuccess` actually waits

### 2. `src/components/admin/agents/realtime/useAgentsRealtime.ts` — Skip echo events

In the profiles change handler, check `isInCooldown('agent-management')` before calling `invalidateRef.current()`. If within cooldown, log and skip.

### 3. `src/components/admin/users/UserManagementTable.tsx` — Fix companies query

Add `staleTime: 30_000` and `refetchOnWindowFocus: false` to the `all-companies-filter` query at line 235 (currently missing these).

### 4. `src/hooks/clients/useRealtimeSubscription.ts` — Add cooldown for clients

Import and check `isInCooldown('clients')` before calling `onDataChange()`, so that admin-triggered client edits don't immediately cascade into a full refetch via the proposal subscription.

## Summary of Changes

| File | Change |
|------|--------|
| `src/hooks/query/useCacheInvalidation.ts` | Add `mutationCooldowns` map + `isInCooldown()` export; make `invalidateAgentManagement` record timestamp and execute synchronously |
| `src/components/admin/agents/realtime/useAgentsRealtime.ts` | Check cooldown before invalidating on realtime event |
| `src/components/admin/users/UserManagementTable.tsx` | Add `staleTime` and `refetchOnWindowFocus: false` to `all-companies-filter` query |
| `src/hooks/clients/useRealtimeSubscription.ts` | Check cooldown before triggering `onDataChange` |

