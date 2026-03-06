

# Why Connor Can't Save After Editing "1540 Piggly Wiggly"

## Root Cause

There are **two compounding bugs** causing the silent save failure:

### Bug 1: No feedback on validation failure

In `useProposalEdit.ts` (lines 324-328), when `validate()` finds errors, the code sets error state and returns `false` — but **never shows a toast**:

```typescript
const validationErrors = validate(formData);
if (Object.keys(validationErrors).length > 0) {
  setErrors(validationErrors);  // Sets error state...
  return false;                 // ...but no toast, no scroll, nothing visible
}
```

The Save button just stops loading. Connor has no idea why it didn't work.

### Bug 2: Validation errors on additional clients are invisible

The `validate` function generates error keys like `addClient_0_name` and `addClient_0_email` for additional clients. But:

- `ProposalEditDialog.tsx` (lines 104-111) passes **no `errors` prop** to `AdditionalClientForm`
- `AdditionalClientForm.tsx` doesn't accept or render any error state — the Name and Email inputs have no red borders or error messages

So even though `setErrors()` is called, the additional client error indicators are never rendered. The user sees a clean form with no indication of what's wrong.

### The Likely Scenario for Connor

After clicking "Make Primary" on Rudi Kassier:
1. Rudi's data moves to the primary fields (works fine)
2. Nicholas Kassier (the old primary) is demoted to `additionalClients[0]`
3. If any field on the demoted Nicholas entry is empty/invalid (e.g., the `name` field didn't populate correctly during the swap), validation blocks the save silently
4. Even if validation passes, the system tries to find/create Rudi as a client record (since `primaryClientId` becomes `null` for a newly typed client). If the `clients` INSERT policy blocks Connor, the save fails with a toast — but if it's a validation issue, there's zero feedback

## Fix Plan

### Fix 1: Add toast on validation failure
**File: `src/hooks/proposals/view/useProposalEdit.ts`**

After `setErrors(validationErrors)` on line 326, add:
```typescript
toast.error('Please fix the highlighted fields before saving.');
```

### Fix 2: Pass errors to AdditionalClientForm
**File: `src/components/proposals/view/ProposalEditDialog.tsx`**

Pass the `errors` object and the client's index to each `AdditionalClientForm`:
```tsx
<AdditionalClientForm
  key={index}
  index={index}
  client={client}
  errors={errors}           // ← NEW
  onChange={updateAdditionalClient}
  onRemove={removeAdditionalClient}
  onMakePrimary={makePrimary}
/>
```

### Fix 3: Render validation errors in AdditionalClientForm
**File: `src/components/proposals/client-info/AdditionalClientForm.tsx`**

- Accept `errors?: Record<string, string>` prop
- Apply red border and error text to Name field when `errors[`addClient_${index}_name`]` exists
- Apply red border and error text to Email field when `errors[`addClient_${index}_email`]` exists

### Summary of Changes

| File | Change |
|------|--------|
| `src/hooks/proposals/view/useProposalEdit.ts` | Add `toast.error()` when validation fails |
| `src/components/proposals/view/ProposalEditDialog.tsx` | Pass `errors` prop to `AdditionalClientForm` |
| `src/components/proposals/client-info/AdditionalClientForm.tsx` | Accept `errors` prop, render field-level error indicators |

This ensures Connor (and all users) will always see exactly which fields are blocking the save.

