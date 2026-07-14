## Why shaun sees "Component failed to load. Retry" on password reset

Supabase auth logs show his reset actually worked end-to-end:

- 16:29:06 — `/recover` hook ran successfully (reset email sent, referer `https://crunchcarbon.com/auth/callback?type=recovery`)
- 16:29:23 — `login` via `otp` succeeded for `shaun.slabber.africa@gmail.com`

So the recovery token was valid and the session was created. The failure is purely a **frontend chunk load error**, not an auth error.

### Root cause

`src/App.tsx` loads `ResetPassword` and `AuthCallback` through `createOptimizedLazyComponent` (`src/lib/performance/OptimizedLoader.tsx`). When the dynamic `import()` throws (typically a stale `index.html` or SW cache referencing a hashed chunk from a previous deploy that no longer exists on the CDN), the helper swallows the error and renders:

```
Component failed to load
[Retry]  → window.location.reload()
```

`location.reload()` frequently re-serves the same cached HTML, so the user stays trapped on the message. Nothing tells the browser to bypass its cache or unregister the old service worker.

This is exactly what shaun is seeing: he clicks the reset link → `/auth/callback?type=recovery` on `crunchcarbon.com` verifies the token, calls `navigate('/reset-password')` → the `ResetPassword` chunk 404s from stale cache → error UI.

### Fix plan (frontend only)

1. **Detect chunk load failures explicitly** in `createOptimizedLazyComponent`.
   - Match error name/message: `ChunkLoadError`, `Failed to fetch dynamically imported module`, `Importing a module script failed`, `error loading dynamically imported module`.

2. **Auto-recover once, then hard-refresh with cache bust.**
   - On first chunk failure per session, set a `sessionStorage` flag (`chunk-reload-<name>`) and force a bypassing reload:
     - `location.replace(location.pathname + location.search + (search has '?' ? '&' : '?') + 'v=' + Date.now() + location.hash)`
     - This changes the URL so the CDN/browser fetches a fresh `index.html` (which references current chunk hashes).
   - If the flag is already set (meaning we already retried and still failed), fall through to the manual error UI so we don't infinite-loop.

3. **Make the "Retry" button do a real cache-busting reload** instead of `window.location.reload()`:
   - Unregister any active service workers (`navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()))`).
   - Clear `caches.keys()` and delete each.
   - Then navigate with the same cache-bust query string as above.

4. **Improve the fallback copy** so the user knows what's happening: "The app was updated. Reloading the latest version..." instead of a generic "Component failed to load".

5. **No changes needed to routing, auth code, `AuthCallback`, `ResetPassword`, or `_headers`** — the auth pipeline is working; this is purely how the app recovers from a stale bundle.

### Files to change

- `src/lib/performance/OptimizedLoader.tsx` — add chunk-error detection, one-shot auto-reload with cache-bust, and upgrade the manual Retry button to clear SW/caches before reloading. Also apply the same handling to the timeout fallback and the default `errorFallback` in `withOptimizedRouteLoading` so any lazy route benefits (not just `ResetPassword`).

### Verification

- Ask shaun to hard-refresh once (Cmd/Ctrl+Shift+R) on `https://crunchcarbon.com/reset-password` — that alone should let him complete the reset today, since his session is already established.
- After the code fix ships: simulate by renaming a built chunk locally or by keeping an old tab open across a deploy; confirm the app auto-reloads once and lands on `/reset-password` instead of showing the error UI.
- Re-check auth logs after his next attempt to confirm `/token?grant_type=recovery` / password update returns 200.

### Immediate workaround for shaun

Send him a fresh reset link and tell him to:
1. Open the link in a **private/incognito window**, or
2. Hard-refresh (Cmd+Shift+R / Ctrl+F5) once the "Component failed to load" screen appears.

Either bypasses the stale cached bundle so the `ResetPassword` chunk downloads correctly.
