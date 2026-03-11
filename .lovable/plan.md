

# Fix: Refresh session before accept-proposal edge function call

## Problem
The `ProposalAcceptance/index.tsx` page calls `supabase.functions.invoke('accept-proposal', ...)` at line 251 **without refreshing the session first**. Even though the edge function has `verify_jwt = false` and uses the service role key internally, the Supabase JS client still attaches the user's JWT as the `Authorization` header. If that token is expired, the gateway (or signing-keys validation) rejects the request before the function code even runs.

## Fix

**File: `src/pages/ProposalAcceptance/index.tsx`**

Add a session refresh call immediately before `supabase.functions.invoke()` in the `handleSubmit` function (around line 250):

```typescript
// Refresh session to ensure valid JWT before edge function call
await supabase.auth.getSession();

// Call the public Edge Function
const { data, error } = await supabase.functions.invoke('accept-proposal', { ... });
```

This is a single-line addition. `getSession()` triggers the SDK's built-in token refresh if the current access token is expired, ensuring a valid JWT is sent with the request.

## Why this works
- `supabase.functions.invoke()` does NOT auto-refresh tokens (unlike database queries)
- `supabase.auth.getSession()` checks the token expiry and refreshes it if needed using the refresh token
- This is the same pattern already documented in the project's memory (`edge-function-token-refresh-guard`)

## Scope
- One file changed, one line added
- No database changes needed
- No edge function changes needed

