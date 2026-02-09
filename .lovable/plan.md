
# Fix "Get Started" Button in Business Calculator

## The Problem

The "Get Started" button you're seeing is in **BusinessCalculator.tsx** (the calculator section on the Business page), not in the bottom CTA section which was already updated. This button on line 122 still navigates to `/register`.

## The Fix

**File:** `src/pages/business/BusinessCalculator.tsx` (line 122-124)

**Current:**
```tsx
onClick={() => navigate("/register")}
>
  Get Started
```

**Updated:**
```tsx
onClick={() => navigate("/calculator")}
>
  Tell Us About Your Solar System
```

## Impact

- Only one file changed: `src/pages/business/BusinessCalculator.tsx`
- The button will now take users to the `/calculator` page where they can share their solar system details
- Consistent with the bottom CTA button that was already updated
