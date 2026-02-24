

# Fix: Knowledge Hub Download Failure

## Root Cause

The download fails immediately with "Invalid file URL" due to a path extraction bug.

### The Bug

The `file_url` stored in the database is:
```
knowledge-hub/marketing/1771922177908_CRUNCH-CARBON-LOGO-ALL-1.png
```

The download function splits on `/knowledge-hub/` (with a leading slash):
```typescript
const path = fileUrl.split('/knowledge-hub/')[1];
```

Since the stored URL has NO leading slash, the split pattern doesn't match. `path` becomes `undefined`, and the function throws "Invalid file URL" -- every single download will fail.

## Fix

### File: `src/hooks/useKnowledgeHub.ts`

Update the `downloadResource` function to handle the stored URL format correctly. Instead of splitting on a pattern that assumes a full URL, check if the URL starts with the bucket name and extract the path accordingly:

```text
Before:
  const path = fileUrl.split('/knowledge-hub/')[1];

After:
  // Handle both formats:
  //   "knowledge-hub/marketing/file.png" (stored as relative path)
  //   "https://.../knowledge-hub/marketing/file.png" (full URL)
  let path = fileUrl.split('/knowledge-hub/')[1];
  if (!path && fileUrl.startsWith('knowledge-hub/')) {
    path = fileUrl.substring('knowledge-hub/'.length);
  }
```

This handles both the current stored format and any future full-URL format.

The same bug exists in the `useDeleteResource` mutation (line 113) which also splits on `/knowledge-hub/` -- that will be fixed with the same pattern.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useKnowledgeHub.ts` | Fix path extraction in `downloadResource` and `useDeleteResource` to handle relative URL format |

## Impact

- All Knowledge Hub downloads will work immediately
- Resource deletion (which also extracts the storage path) will also be fixed
- No database or storage changes needed

