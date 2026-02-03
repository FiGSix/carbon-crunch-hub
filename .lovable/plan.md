

## Problem

Every status badge shows a "0" next to it (e.g., "Sent 0", "Delivered 0"). This is caused by a common React conditional rendering bug.

## Root Cause

In `ProposalList.tsx` line 109, the code uses:

```tsx
{proposal.engagement_count && proposal.engagement_count > 0 && ... && (
  <ProposalEngagementBadge ... />
)}
```

When `engagement_count` is `0`:
- `proposal.engagement_count` evaluates to `0` (falsy)
- JavaScript short-circuits and returns `0`
- **React renders `0` as literal text** instead of rendering nothing

This is a well-known React pitfall - when using `&&` for conditional rendering, if the left operand is a falsy number (`0`), React will display it.

## Solution

Change the conditional to explicitly check for a boolean instead of relying on truthy/falsy evaluation:

**File:** `src/components/proposals/ProposalList.tsx`

**Line 109 - Current:**
```tsx
{proposal.engagement_count && proposal.engagement_count > 0 && !proposal.signed_at && ...
```

**Line 109 - Fixed:**
```tsx
{proposal.engagement_count > 0 && !proposal.signed_at && ...
```

By removing `proposal.engagement_count &&` and only keeping `proposal.engagement_count > 0`, the expression will evaluate to `false` (not `0`) when the count is zero, and React will correctly render nothing.

## Technical Details

| Expression | When count = 0 | React renders |
|------------|----------------|---------------|
| `count && count > 0` | `0` (falsy number) | "0" |
| `count > 0` | `false` (boolean) | nothing |

This is a one-line fix.

