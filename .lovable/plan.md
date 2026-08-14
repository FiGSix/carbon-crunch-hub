# Fix: dashboard loads signed-in but with no profile

## What the screenshot shows

You are signed in (the "successfully logged in" toast fired, `/logout` and login requests succeed), but the app has no profile data for you:

- Sidebar shows only "Sign Out" — every nav item is filtered by `profile.role`, which is empty.
- Header says "DASHBOARD" instead of "ADMIN DASHBOARD" — `userRole` is undefined.
- Avatar shows "?" — no profile initials.
- Cards sit on skeletons / "No revenue data available" — role-dependent queries never resolve.

So the session is fine; the single `profiles` row fetch after login is what failed.

## What I verified in the database (not guesses)

- `profiles` RLS: `SELECT` policy is `auth.uid() = id OR is_current_user_admin()` — correct, and `anon` is blocked.
- Table privileges on `profiles` are intact for `authenticated`, `anon`, `service_role`.
- Every column the app selects exists (including `super_partner_status`, `can_create_proposals`).
- `is_current_user_admin()` → `has_role()` → `user_roles` (273 rows) is healthy, and your account resolves as `admin`.

Conclusion: the backend is not rejecting the read. The failure is on the client side, in how the profile fetch is performed and recovered from — and today that failure is completely invisible, which is why it looks like "the site is down".

## Root cause in the code (`src/contexts/auth/AuthContext.tsx`)

Three design flaws make a single failed fetch permanent and silent:

1. **Errors are swallowed.** Both the `error` branch and the `catch` set the profile to `null` with no log, no toast, no error state.
2. **Failures are cached.** A failed load writes `{ data: null }` into `profileCache`, so subsequent calls return the failure instead of retrying.
3. **No retry and no recovery path.** Nothing re-attempts on `TOKEN_REFRESHED`, on reconnect, or via any user action. Once null, it stays null until a full reload — and even a reload can land on the same transient failure.

A transient network blip, a cold start, or a slow first request after login is therefore enough to leave the app in exactly the broken-looking state in your screenshot.

## The fix (root-level rewrite of profile loading, not a patch)

Rewrite the profile-loading path in `AuthContext.tsx`:

- **Never cache failures.** Only successful loads go into the cache; a failure clears it so the next attempt actually hits the network.
- **Retry with backoff.** Up to 3 attempts (roughly 0s / 400ms / 1.2s) before giving up, so transient failures self-heal.
- **Track a real state.** Add `profileError` alongside `authError`, and expose `refreshUser()` as the retry action.
- **Re-load on auth events.** Reload the profile on `SIGNED_IN` and `TOKEN_REFRESHED`, and on `window` regaining focus when the profile is missing but a session exists.
- **Log the real error.** Report the Supabase error code/message through the existing `authLogger` (and Sentry in production) so a repeat is diagnosable instead of invisible.

Then add a visible recovery surface instead of a half-empty dashboard:

- In `DashboardLayout`, when there is a valid session but no profile after retries, render a small "We couldn't load your account details" panel with a **Retry** button (calls `refreshUser`) and a **Sign out** link — rather than a broken sidebar and permanent skeletons.

## Technical notes

- Files touched: `src/contexts/auth/AuthContext.tsx` (retry/cache/error logic, new `profileError` in the context type in `src/contexts/auth/types.ts` if needed) and `src/components/layout/DashboardLayout.tsx` (recovery panel).
- No database changes — RLS, grants, functions and roles all check out.
- `DashboardSidebar` needs no change; once `profile.role` is populated it renders correctly.

## If it still happens after this

The retry logging will name the exact failure (401 vs network vs RLS). At that point the fix is targeted rather than speculative.
