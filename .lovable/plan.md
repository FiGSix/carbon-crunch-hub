

# Root Cause Analysis: Page Freezing on Action Button Click

## The Real Problem (Not Realtime Loops)

The previous fix addressed realtime echo loops, but the freeze happens **immediately when clicking an action button** — before any mutation or realtime event. The root cause is a **rendering performance catastrophe** triggered by Radix DropdownMenu opening.

### Critical Bug #1: `memo()` Defined Inside Component (Clients Page)

In `ClientsTableContent.tsx` (line 170), `ClientsTableRows` is defined with `memo()` **inside** the parent component function:

```text
export function ClientsTableContent(...) {
  // ... state ...
  
  const ClientsTableRows = memo(function ClientsTableRows(...) {  // LINE 170
    // renders all rows
  });
  
  return <ClientsTableRows ... />;
}
```

This is a well-known React anti-pattern. Every time `ClientsTableContent` re-renders, **a brand new component type** is created. React sees a different component type each render, so it **unmounts and remounts every single table row** instead of diffing them. With 50+ clients, this means:

1. User clicks the "⋮" action button
2. Radix DropdownMenu opens → internal state change → parent re-renders
3. `ClientsTableRows` is recreated as a new component type
4. React unmounts ALL rows, remounts ALL rows from scratch
5. Each row contains a DropdownMenu, Badge, multiple cells — expensive DOM work
6. Main thread blocks for 500ms-2000ms → **page appears frozen**

### Critical Bug #2: No Row Memoization (Users & Agents Pages)

`UserManagementTable.tsx` renders 400+ rows inline (lines 401-523) with **no memoization at all**. Every state change (search input keystroke, dropdown open, filter change) re-renders the entire table body. The same applies to `AgentsTableContent.tsx`.

### Critical Bug #3: Dialogs Trigger Full Re-renders

All three pages open dialogs (Edit, Delete, Reassign) that set state on the parent component (`setEditDialogOpen`, `setSelectedUser`, etc.). This state lives in the same component as the table, so **opening any dialog re-renders every row**.

## The Fix

### 1. `src/components/clients/table/ClientsTableContent.tsx` — Move memo outside

Extract `ClientsTableRows` to a **top-level memoized component** defined outside `ClientsTableContent`. This ensures React reuses the same component type across renders and only re-renders rows when their props actually change.

Additionally, extract each table row into a memoized `ClientRow` component so individual rows don't re-render when sibling rows change.

### 2. `src/components/admin/users/UserManagementTable.tsx` — Add row memoization

Extract a `UserRow` memoized component for the table body. Move dialog state management into a separate hook or use a reducer so opening a dialog doesn't cause every row to re-render.

### 3. `src/components/admin/agents/AgentsTableContent.tsx` — Add row memoization

Same pattern: extract a memoized `AgentRow` component.

### 4. `src/components/clients/SimpleClientsTable2.tsx` — Same fix needed

This component also renders all rows inline with no memoization. Extract a memoized `ClientRow2` component.

### 5. Stabilize callback props

All `onClick` handlers inside `.map()` create new function references each render (e.g., `onClick={() => onEdit(client)}`). These defeat memo. Use `useCallback` with client ID, or pass the client ID to the memoized row and let it handle the callback internally.

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/clients/table/ClientsTableContent.tsx` | Move `ClientsTableRows` and individual `ClientRow` outside component as top-level `memo` components |
| `src/components/clients/SimpleClientsTable2.tsx` | Extract memoized `ClientRow2` component |
| `src/components/admin/users/UserManagementTable.tsx` | Extract memoized `UserRow` component |
| `src/components/admin/agents/AgentsTableContent.tsx` | Extract memoized `AgentRow` component |

This eliminates the freeze because:
- React no longer unmounts/remounts all rows on every interaction
- Opening a dropdown only re-renders the affected row
- Dialog state changes don't cascade to row re-renders

