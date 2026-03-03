

# Fix: Page Freezing on Users and Agents Pages

## Root Causes Identified

### 1. Realtime subscription infinite loop (Agents page)

In `src/components/admin/agents/realtime/useAgentsRealtime.ts`, the `useEffect` at line 13 has `[toast, invalidateAgentManagement]` as dependencies. While `invalidateAgentManagement` is wrapped in `useCallback`, `toast` from `useToast()` may not be referentially stable across renders. Each time the dependency changes, the effect tears down and recreates the Supabase realtime channel, causing a subscribe/unsubscribe loop.

Additionally, this realtime hook subscribes to ALL proposal changes (line 77-88), meaning every single proposal update across the entire system triggers `invalidateAgentManagement()`, which refetches agent data, which re-renders, which can cascade.

**Fix:**
- Remove `toast` and `invalidateAgentManagement` from the dependency array -- use refs instead to access current values without triggering re-subscriptions.
- Narrow the proposals subscription or remove it entirely (proposal stats don't need live updates).

### 2. Waterfall queries without error boundaries (Users page)

In `src/components/admin/users/UserManagementTable.tsx`, the main query (line 77-228) makes 5+ sequential Supabase calls in a single `queryFn`:
1. Fetch all profiles
2. Fetch company_members filtered by all profile IDs
3. Fetch client_company_members filtered by all profile IDs
4. Fetch companies by IDs
5. Fetch client_companies by IDs
6. Fetch unlinked clients

If any of these hang or the `.in()` call has a very large array, the entire query blocks. There's no timeout protection.

**Fix:**
- Wrap the queryFn with the existing `withTimeout` utility (from `src/services/unified/utils/withTimeout.ts`) to prevent indefinite hanging.
- Add `staleTime` to prevent unnecessary refetches.

### 3. RPC call on every realtime event

In `useAgentsRealtime.ts` line 99, `supabase.rpc('test_rls_policies')` is called every time the effect runs. This is unnecessary overhead that runs on mount and on every resubscription.

**Fix:** Remove the `enableRealtime` function entirely -- it serves no purpose.

## Changes

### File 1: `src/components/admin/agents/realtime/useAgentsRealtime.ts`
- Use `useRef` for `toast` and `invalidateAgentManagement` to keep the effect dependency array empty (`[]`)
- Remove the `proposals` table subscription (it's too broad and causes cascading refetches)
- Remove the unnecessary `enableRealtime()` / `test_rls_policies` RPC call
- Add debouncing for the agent_activities subscription

### File 2: `src/components/admin/users/UserManagementTable.tsx`
- Wrap the `queryFn` with `withTimeout` (15 second limit)
- Add `staleTime: 30_000` to prevent refetching on every focus/remount
- Add `refetchOnWindowFocus: false` to prevent refetch storms when switching tabs

## Expected Result
- Agents page will no longer create a subscribe/unsubscribe loop
- Proposal changes system-wide will no longer trigger agent page refetches
- Users page will timeout gracefully instead of hanging indefinitely
- Both pages will feel responsive and not freeze the browser
