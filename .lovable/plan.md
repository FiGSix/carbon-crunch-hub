# Plan: Redirect /signup to /register

## Goal
Make `crunchcarbon.com/signup` forward to `/register` so people who guess or find the old URL still land on the working sign-up form.

## Files to change
- `src/App.tsx` (only file)

## Changes

### 1. Add the `Navigate` import
Update the `react-router-dom` import in `src/App.tsx` to include `Navigate` alongside the existing `BrowserRouter`, `Routes`, `Route`, and `useLocation`.

### 2. Add a `/signup` redirect route
Insert a new public route immediately above the existing `/register` route:

```tsx
<Route path="/signup" element={<Navigate to="/register" replace />} />
```

To preserve any query parameters that might be attached to a `/signup` link (e.g., `?ref=...`), the route will use a small wrapper or `to` object that carries the current search string over to `/register`.

### 3. No other routing changes
- The `/register` route stays exactly as it is.
- The existing catch-all `*` route remains `NotFound`.
- No server/hosting config files are needed; Lovable hosting already falls back to `index.html` for unknown SPA paths, so the new client-side route will be reached and perform the redirect.

## Verification
- Run a type check / build to ensure the import and route are valid.
- Use a browser/Playwright check that navigating to `http://localhost:8080/signup` redirects to `http://localhost:8080/register` and the registration form renders.