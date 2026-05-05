The published app is still trying to save an `updated_at` field on `partner_api_keys`, but that table does not have an `updated_at` column. I confirmed the current component still contains:

```ts
.update({ scopes: selected, updated_at: new Date().toISOString() })
```

That explains why selecting/saving scopes still fails.

Plan:

1. Update `src/components/admin/partners/ManageScopesDialog.tsx`
   - Change the update payload to only save `scopes`:
     ```ts
     .update({ scopes: selected })
     ```
   - Do not add `updated_at` unless the database schema is intentionally migrated to include it.

2. Improve the error toast
   - Replace the generic `Failed to update scopes` message with the actual Supabase error message when available.
   - This will make future failures visible instead of masked.

3. Keep the fix minimal
   - No database migration is needed.
   - No API-key regeneration or partner-table changes are needed.
   - This directly fixes the root cause currently present in the file.

Technical notes:

- `partner_api_keys` was created with `created_at` and `expires_at`, but no `updated_at` column.
- The frontend update currently includes a non-existent column, so PostgREST rejects the update before scopes are saved.
- The earlier intended fix appears not to be present in the current codebase, so I will re-apply it cleanly.