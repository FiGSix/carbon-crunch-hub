

# Fix: Edit Dialog Save Fails for Proposals with firstName/lastName Format

## Root Cause

The `clientInfo` JSON in proposals has **two different name formats** depending on how the proposal was created:

- **Format A**: `{ "name": "Estelle" }` -- used by some creation flows
- **Format B**: `{ "firstName": "Estelle", "lastName": "..." }` -- used by other creation flows

Estelle's 4 proposals (Toothrock Huis, Fijnbosch Self-Catering, Dagdromer, DAAI PLEKKIE) all use Format B with NO `name` field.

The edit form's `extractFormData` reads `clientInfo.name`, gets `undefined`/empty, so the Client Name field appears **blank**. When you click Save, validation rejects it with "Client name is required" -- even though the data exists in `firstName`/`lastName`.

**Scale**: 862 of 1079 proposals use `firstName`/`lastName`. Any that lack a `name` field will have this same bug.

## Fix

### File: `src/hooks/proposals/view/useProposalEdit.ts`

Update `extractFormData` to handle both name formats when populating `clientName`:

```text
Before:
  clientName: clientInfo.name || '',

After:
  clientName: clientInfo.name
    || [clientInfo.firstName, clientInfo.lastName]
        .filter(n => n && n !== 'null')
        .join(' ')
    || '',
```

The `lastName: "null"` (string "null") in Estelle's data needs to be filtered out, hence the `n !== 'null'` check.

Also update the `save` function to write back **both** `name` AND `firstName`/`lastName` to the clientInfo, so future edits work regardless of which format was originally used:

```text
// In the save function's updatedContent.clientInfo:
clientInfo: {
  ...oldContent.clientInfo,
  name: formData.clientName.trim(),
  firstName: formData.clientName.trim().split(/\s+/).slice(0, -1).join(' ') || formData.clientName.trim(),
  lastName: formData.clientName.trim().split(/\s+/).pop() || '',
  email: formData.clientEmail.trim(),
  phone: formData.clientPhone.trim(),
  companyName: formData.clientCompanyName.trim(),
},
```

This ensures both formats are always present after an edit, preventing future mismatches.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/proposals/view/useProposalEdit.ts` | Handle `firstName`/`lastName` fallback in `extractFormData`; write both name formats on save |

## Impact

- Immediately fixes editing for all 4 of Estelle's proposals
- Fixes any other proposals that only have `firstName`/`lastName` (no `name` field)
- After saving, proposals will have both name formats, preventing future issues
- No database migration needed

