

# Fix: `data.systemSize.trim is not a function` TypeError

## Root Cause

The `systemSize` field in `ProposalEditFormData` is typed as `string`, but at runtime it can be a number. This happens in `extractFormData()` (lines 78-80) where `projectInfo.size` may already be a number from the database JSON. When `validate()` calls `data.systemSize.trim()` at line 121, it crashes.

The same issue could theoretically affect `commissionDate` or other fields extracted from untyped JSON.

## Fix

**File: `src/hooks/proposals/view/useProposalEdit.ts`**

Two changes:

1. **`extractFormData`** (line 78-80): Coerce `systemSize` to string safely:
   ```typescript
   systemSize: String(
     projectInfo.size
     || (projectInfo as any).totalSystemSize
     || proposal.system_size_kwp
     || ''
   ),
   ```

2. **`validate`** (line 121): Defensive coercion before `.trim()`:
   ```typescript
   const sizeStr = String(data.systemSize || '');
   if (!sizeStr.trim()) {
     errors.systemSize = 'System size is required';
   } else if (parseFloat(sizeStr) <= 0 || isNaN(parseFloat(sizeStr))) {
     errors.systemSize = 'System size must be a positive number';
   }
   ```

This ensures the save flow no longer crashes regardless of what type the database JSON contains.

