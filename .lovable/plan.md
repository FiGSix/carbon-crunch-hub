

# Comprehensive `modal={false}` Fix for All DropdownMenu Components

## Problem

The previous fixes only covered some files. There are **6 more files** with `<DropdownMenu>` (no `modal={false}`) that can trigger the same Radix `pointer-events: none` bug. Some open dialogs directly (high risk), others call mutations that could trigger toast/dialog interactions (lower risk but still worth fixing defensively).

## Files to Fix

| File | Opens Dialog? | Risk |
|------|--------------|------|
| `src/components/admin/agents/LeadsAgentsTable.tsx` | Yes — View Details, Send Outreach, Outreach History, Convert dialogs | High |
| `src/components/admin/agents/InvitedAgentsTable.tsx` | No — direct mutations only | Low (defensive) |
| `src/components/admin/agents/PendingAgentsTable.tsx` | No — direct mutations only | Low (defensive) |
| `src/components/admin/agents/SuspendedAgentsTable.tsx` | No — direct mutations only | Low (defensive) |
| `src/components/admin/partners/ActivePartnersTable.tsx` | Yes — View Details, ApiKeyRevealDialog | High |
| `src/components/notifications/NotificationList.tsx` | No — likely safe | Low (defensive) |

## Change

Same one-prop fix in each file:

```tsx
// Before
<DropdownMenu>

// After
<DropdownMenu modal={false}>
```

Six files, one line each. This covers every remaining `DropdownMenu` in the codebase that doesn't already have `modal={false}`.

