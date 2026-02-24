

# Fix: Detect Duplicate Signup and Show "Account Already Exists"

## Root Cause

When a user signs up with an email that already exists, Supabase Auth does NOT return an error. Instead, it returns a 200 response with `data.user` present but `data.user.identities` as an empty array (`[]`). This is Supabase's way of signaling a duplicate without leaking account existence to attackers.

The current code in `useRegisterForm.ts` (line 201-203) only checks for an explicit `error` object. Since none is returned, it falls through to line 444 and navigates to `/verify-email` -- where the user waits forever for an email that was never sent.

## The Fix

Two small, surgical changes:

### 1. Add duplicate detection in `signUp.ts`

After the Supabase call returns, check if `data.user.identities` is empty. If so, return a clear error instead of silently succeeding.

**File:** `src/lib/supabase/auth/signUp.ts`

```typescript
const { data, error } = await supabase.auth.signUp({ ... });

// Detect duplicate signup: Supabase returns a user with empty identities
if (!error && data?.user && (!data.user.identities || data.user.identities.length === 0)) {
  return {
    data: null,
    error: new Error("An account with this email already exists. Please log in or reset your password.")
  };
}

return { data, error };
```

### 2. Improve error handling in `useRegisterForm.ts`

The existing catch block (line 446-457) already shows a toast with `error.message` and does NOT navigate to `/verify-email`. So the fix in `signUp.ts` is sufficient -- the error will propagate, the toast will display "An account with this email already exists. Please log in or reset your password.", and the user stays on the registration page.

No changes needed in `useRegisterForm.ts` for basic functionality. However, we can optionally enhance the error toast to include direct links to login/reset:

**File:** `src/hooks/useRegisterForm.ts` -- in the catch block, detect the specific message and show a more helpful toast with action links.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/supabase/auth/signUp.ts` | Add empty-identities check after `supabase.auth.signUp()` |
| `src/hooks/useRegisterForm.ts` | Enhance catch block to show "Log in" / "Reset password" links for duplicate accounts |

## What the user will see

Instead of being sent to the verification splash page, users who try to register with an existing email will:
1. Stay on the registration form
2. See a toast: "Account already exists -- Please log in or reset your password"
3. The toast description will guide them to the login page

