

# 404 Page Copy Updates

## Overview
Simple content refinements to streamline the 404 page messaging - removing redundant text and consolidating the message.

---

## Changes Required

### File: `src/pages/NotFound.tsx`

| Change | Before | After |
|--------|--------|-------|
| Sub-headline | "Looks like this page couldn't be verified." | "The credits you're looking for aren't here, sadly." |
| Explanatory text | "This route didn't pass our grid audit..." | **Remove entirely** |
| Secondary link | "Explore Carbon Credits" | **Remove entirely** |

---

## Updated Layout Structure

```text
+------------------------------------------+
|                                          |
|        [GENEROUS NEGATIVE SPACE]         |
|                                          |
|     404 - NOTHING TO CRUNCH HERE         |
|                                          |
|   The credits you're looking for         |
|   aren't here, sadly.                    |
|                                          |
|         [BACK TO HOME BUTTON]            |
|                                          |
|     [PIXEL GHOST IMAGE - CENTERED]       |
|                                          |
|        [GENEROUS NEGATIVE SPACE]         |
|                                          |
+------------------------------------------+
```

---

## Technical Details

Remove lines 44-54 (explanatory text paragraph) and lines 73-80 (secondary link) from `NotFound.tsx`, and update the sub-headline text on line 37.

