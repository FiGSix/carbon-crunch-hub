
# Update Business Page Content

## Overview

Three updates to the Business landing page:
1. Update system size limit text
2. Update Annual Payouts section content
3. Update CTA button to redirect to the calculator with better messaging

---

## Changes Required

### 1. BusinessHeroSection.tsx (Line 104)

**Current:**
```
No maximum size
```

**Updated:**
```
maximum 15MWp per project
```

---

### 2. BusinessHowItWorks.tsx (Lines 26-27)

**Current:**
```
title: "Annual Payouts + ESG Reports"
description: "Receive your carbon credit earnings annually, plus official documentation for sustainability reporting."
```

**Updated:**
```
title: "Annual Payouts or Carbon Credits"
description: "Receive your carbon credit earnings or Carbon Credits annually to apply against your Carbon Taxes or Net Zero targets for sustainability reporting."
```

---

### 3. BusinessCTA.tsx (Lines 38-41)

**Current:**
```tsx
onClick={() => navigate("/register")}
>
  Get Started Free
```

**Updated:**
```tsx
onClick={() => navigate("/calculator")}
>
  Tell Us About Your Solar System
```

This redirects users to the `/calculator` page which has the "Tell Us About Your Solar System" form - a more natural entry point for capturing system details.

---

## Files to Modify

| File | Line(s) | Change |
|------|---------|--------|
| `src/pages/business/BusinessHeroSection.tsx` | 104 | "No maximum size" → "maximum 15MWp per project" |
| `src/pages/business/BusinessHowItWorks.tsx` | 26-27 | Title and description update |
| `src/pages/business/BusinessCTA.tsx` | 38-41 | Button text and route update |

---

## Impact

These changes update:
- Visual content card in the hero section
- Step 4 of the "How It Works" section
- Primary CTA button at bottom of page (redirects to calculator instead of registration)

No other pages or components are affected.
