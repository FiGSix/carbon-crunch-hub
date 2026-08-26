# Super Partner sees two dashboards on login

## What's happening

The login redirect decides where to send you based on the user's profile role, but it fires as soon as the session exists — before the profile (and therefore the role) has finished loading. At that moment `profile?.role` is undefined, so the code falls through to the generic `/dashboard` (the agent/partner dashboard). A moment later the profile arrives and the Super Partner dashboard is reached via the sidebar link / a second navigation, which reads as "two dashboards loading".

Confirmed in `src/pages/Login.tsx`: the redirect effect only waits on `user` and `session`, computes `roleDefault` from `profile?.role`, and locks the decision with a `hasRedirectedRef` guard. `profile` is not in the effect's dependency list, so the choice is never re-evaluated once the role is known.

There is no guard on `/dashboard` itself — a Super Partner who lands there stays there and renders the generic dashboard.

## The fix

1. Wait for the role before redirecting. In `Login.tsx`, hold the "Redirecting…" state until the profile/role has resolved (or a short timeout elapses), then navigate once to the correct landing page. Add `profile` to the effect dependencies and don't set the redirect guard until the destination is final.

2. Make `/dashboard` role-correct on its own. Add a redirect at the top of the `/dashboard` route so that a `super_partner` (who is not an admin) is sent to `/super-partner/dashboard`. This covers direct URL entry, bookmarks, browser back, and the `/dashboard` fallbacks used by `PrivateRoute` and `DashboardLayout` when access is denied — so the generic dashboard can never flash for a Super Partner.

3. Point the "insufficient permissions" fallbacks at the role's own landing page instead of a hardcoded `/dashboard`, so a denied Super Partner bounces straight to their dashboard rather than through the wrong one.

## Technical notes

- `src/pages/Login.tsx` — gate the redirect on role resolution; add `profile` to deps; single `navigate(..., { replace: true })`.
- `src/pages/Dashboard.tsx` — early `<Navigate to="/super-partner/dashboard" replace />` when `userRole === 'super_partner'`.
- `src/components/auth/PrivateRoute.tsx` and `src/components/layout/DashboardLayout.tsx` — replace the hardcoded `/dashboard` fallback with a role-aware destination.
- Sidebar already shows a single "Dashboard" entry per role, so no change there.

No database or backend changes.
