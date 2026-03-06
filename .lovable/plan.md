

# Fix: Replace RLS-Blocked Client Lookup with RPC

## Problem

The validation feedback fixes (toast + error display) are correctly implemented. However, the **core save failure** persists because of lines 401-405 in `useProposalEdit.ts`:

```typescript
const { data: existing } = await supabase
  .from('clients')
  .select('id')
  .eq('email', formData.clientEmail.trim())
  .maybeSingle();
```

This direct table query is blocked by RLS for agents who didn't create the client record. When the lookup returns `null`, the code tries to INSERT a new client, which fails with a unique constraint violation if that email already exists elsewhere in the system.

For **genuinely new clients**, the INSERT itself may also fail if RLS blocks it — though the `clients` INSERT policy allows agents (`is_current_user_agent()`), so new clients should work once the lookup is fixed.

## Fix

**File: `src/hooks/proposals/view/useProposalEdit.ts`** (lines 401-405)

Replace the direct table query with the existing `search_clients` RPC, which has company-scoped visibility:

```typescript
// Before (RLS-blocked):
const { data: existing } = await supabase
  .from('clients')
  .select('id')
  .eq('email', formData.clientEmail.trim())
  .maybeSingle();

// After (RPC with proper visibility):
const { data: searchResults } = await supabase.rpc('search_clients', {
  search_term: formData.clientEmail.trim()
});
const existing = searchResults?.find(
  (r: any) => r.email?.toLowerCase() === formData.clientEmail.trim().toLowerCase()
) || null;
```

If `existing` is found, use `existing.id` as the `resolvedPrimaryClientId`. Otherwise, proceed with the INSERT (which already has error handling from the previous fix).

## Files to Change

| File | Change |
|------|--------|
| `src/hooks/proposals/view/useProposalEdit.ts` | Replace direct `clients` SELECT (lines 401-405) with `search_clients` RPC call |

