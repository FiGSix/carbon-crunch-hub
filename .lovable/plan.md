

# Root Cause: Radix `pointer-events: none` Stuck on Body

## The Actual Problem

This is a **well-documented Radix UI bug** ([#3317](https://github.com/radix-ui/primitives/issues/3317), [#1241](https://github.com/radix-ui/primitives/issues/1241)) — not a React re-render or memoization issue. Every previous "fix" addressed the wrong thing.

**What happens:**

1. User clicks the DropdownMenu trigger (⋮ button) on a table row
2. Radix sets `pointer-events: none` on `<body>` as part of its modal overlay behavior
3. User clicks a menu item that opens a Dialog (Edit Client, View Details, Manage Roles, etc.)
4. The DropdownMenu closes and the Dialog opens simultaneously
5. Two competing `DismissableLayer` instances clash — the Dialog saves the current body style (`pointer-events: none`) as the "original" to restore later
6. When the Dialog closes, it restores `pointer-events: none` instead of removing it
7. **The entire page becomes unresponsive** — nothing is clickable

This affects all three admin pages because they all follow the same pattern: **DropdownMenu → click item → open Dialog**.

## The Fix — One Change, At the Root

Add `modal={false}` to every `DropdownMenu` that programmatically opens a Dialog. This prevents Radix from setting `pointer-events: none` on body in the first place, eliminating the conflict entirely.

**Affected files:**

| File | What changes |
|------|-------------|
| `src/components/clients/table/ClientsTableContent.tsx` | Add `modal={false}` to `<DropdownMenu>` (line ~85) |
| `src/components/admin/agents/AgentsTableContent.tsx` | Add `modal={false}` to `<DropdownMenu>` inside `AgentRow` (line ~192) |
| `src/components/admin/users/UserManagementTable.tsx` | Add `modal={false}` to both `<DropdownMenu>` instances inside `UserRow` (lines ~153, ~172) |

**The change per file is a single prop addition:**
```tsx
// Before
<DropdownMenu>

// After  
<DropdownMenu modal={false}>
```

No new abstractions. No memoization changes. No realtime subscription changes. Just fixing the actual Radix interaction bug at the component level where it occurs.

## Why Previous Fixes Didn't Work

The previous fixes (memoization, `useRef` for handlers, mutation cooldowns, `useDeferredValue`) addressed **React rendering performance** — which was never the problem. The page wasn't slow due to re-renders; it was literally unclickable because `pointer-events: none` was stuck on the body element. These are completely different failure modes that look identical to the user ("the page froze").

