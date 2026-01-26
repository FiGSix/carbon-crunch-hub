

# Fix: Agent Invitation Token Validation Blocked by RLS

## Root Cause Confirmed

The `agent_invitations` table **does** contain Mario's invitation (I verified this directly in the database). The problem is that when Mario clicks the invitation link and lands on the registration page:

1. He is **not authenticated** yet (he's trying to register)
2. The registration form tries to validate the token by querying `agent_invitations`
3. The current RLS policies only allow **admins** to SELECT from this table
4. The query returns no results (RLS blocks it)
5. The code interprets this as "Invalid Invitation"

## Current RLS Policies on `agent_invitations`

| Policy Name | Command | Rule | Problem |
|------------|---------|------|---------|
| Admins can view all invitations | SELECT | `is_current_user_admin()` | Requires authentication |
| Admins can insert invitations | INSERT | `is_current_user_admin()` | OK |
| System can update invitations | UPDATE | `true` | OK |

**Missing: A policy allowing anonymous users to validate pending invitation tokens**

## Solution

Add an RLS policy that allows anonymous (`anon`) users to read invitation records, but **only** for:
- Invitations with `status = 'pending'`
- Invitations that haven't expired (`expires_at > now()`)

This is secure because:
- The token itself is a 64-character secret - you need to know it to find the record
- Only pending, non-expired invitations are visible
- Anonymous users can only SELECT (not INSERT/UPDATE/DELETE)

## Database Migration

```sql
-- Allow anonymous users to validate pending invitation tokens during registration
-- This is required because users need to validate their invitation BEFORE they can register/authenticate
-- Security: The 64-character token acts as the secret - you must know it to find the invitation
CREATE POLICY "Anon can validate pending invitation tokens"
ON public.agent_invitations
FOR SELECT
TO anon
USING (
  status = 'pending' 
  AND expires_at > now()
);
```

## Files Changed

| Type | Change |
|------|--------|
| Database Migration | Add new RLS policy for anonymous token validation |

## Why This Wasn't Caught Before

1. Testing may have been done while already logged in as admin
2. Previous invitations may have worked during a period when RLS was configured differently
3. The error message "Invalid Invitation" doesn't indicate that RLS blocked the query

## After This Fix

1. Mario clicks the invitation link
2. Registration page loads and validates the token (RLS now allows this)
3. Form is pre-filled with Mario's details (name, email, company)
4. Mario completes registration successfully
5. Invitation is marked as "accepted"

