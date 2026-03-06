

# Fix: Remaining `systemSize.trim()` Crashes in Save Function

## Problem

The validation function was fixed with `String()` coercion, but the `save()` function still calls `formData.systemSize.trim()` directly in two places (lines 378 and 391). Since `systemSize` can be a number at runtime, these crash with `TypeError: o.systemSize.trim is not a function`.

## Fix

**File: `src/hooks/proposals/view/useProposalEdit.ts`**

- **Line 378**: Change `formData.systemSize.trim()` → `String(formData.systemSize || '').trim()`
- **Line 391**: Change `formData.systemSize.trim()` → `String(formData.systemSize || '').trim()`

Two single-line changes. No other files affected.

