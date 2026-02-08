

# Fix: Switch Homepage to Use Updated Index Component

## Problem Summary

The routing configuration in `App.tsx` is rendering `SimplifiedIndex` (a debugging page) instead of the fully updated `Index` component with all the new SEO and conversion optimizations.

## Solution

Update `App.tsx` to use the updated `Index` component for the homepage route (`/`).

---

## Files to Modify

### `src/App.tsx`

**Change 1: Update the homepage route (line 138-142)**

From:
```tsx
<Route path="/" element={
  <PageErrorBoundary pageName="Home">
    <SimplifiedIndex />
  </PageErrorBoundary>
} />
```

To:
```tsx
<Route path="/" element={
  <PageErrorBoundary pageName="Home">
    <Suspense fallback={<PageLoader />}><Index /></Suspense>
  </PageErrorBoundary>
} />
```

**Change 2: Remove the `/original` route (line 171-175)** since it's no longer needed once the main route uses `Index`.

**Change 3: Optionally keep `SimplifiedIndex` available at `/debug-home`** for future debugging purposes.

---

## Implementation Details

| Item | Action |
|------|--------|
| Import cleanup | Remove `SimplifiedIndex` from immediate imports if no longer used |
| Route swap | Replace `SimplifiedIndex` with `Index` + `Suspense` wrapper at `/` |
| `/original` route | Remove or rename to `/debug-home` |
| Lazy loading | Keep `Index` as a lazy-loaded component for optimal performance |

---

## Expected Result

After this change:
- Homepage (`/`) will display the updated `Index` with:
  - New value-focused HeroSection
  - AudienceSelector (Homeowner vs Agent routing)
  - CalculatorPromo section
  - SecuritySection
  - Trust badges
  - Updated CTASection with urgency messaging
  - Sticky mobile CTA
- All SEO optimizations will be visible
- All new components will render correctly

