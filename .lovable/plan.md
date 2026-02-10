

# Add "Export Users" Button to Admin User Management

## What This Does

Adds an **Export CSV** button to the Admin User Management page that downloads a CSV file containing user names, surnames, and emails -- ready to import into Resend for your Quarterly Newsletter.

## Export Format

The CSV will include:

| First Name | Last Name | Email |
|------------|-----------|-------|
| John       | Doe       | john@example.com |

You can then upload this CSV directly into Resend's audience/contact list for newsletter campaigns.

## Scope

This is a small, focused change:

- **1 new file**: `src/components/admin/users/ExportUsersButton.tsx` -- a reusable export button following the same pattern as the existing `ExportButton.tsx` in the clients module
- **1 modified file**: `src/components/admin/users/UserManagementHeader.tsx` -- add the export button to the header area

## Technical Details

### New Component: `ExportUsersButton.tsx`

- Receives the filtered `users` array from `UserManagementTable`
- Exports a CSV with columns: `First Name`, `Last Name`, `Email`
- Skips users with no email
- Uses the same CSV download pattern already established in `ExportButton.tsx`

### Integration Approach

The `UserManagementTable` already has the `users` array (filtered by search/role/company). Rather than re-fetching data, we will:

1. Lift the export button into `UserManagementTable.tsx` (next to the search/filter controls)
2. Pass the current filtered `users` list to the export button
3. This means the export respects whatever filters the admin has applied (e.g., export only clients, only a specific company, etc.)

### File Changes

**`src/components/admin/users/ExportUsersButton.tsx`** (new):
- Button component with Download icon
- `exportToCSV` function generating `First Name, Last Name, Email` columns
- Filename: `users-newsletter-export-YYYY-MM-DD.csv`

**`src/components/admin/users/UserManagementTable.tsx`** (modified):
- Import and render `ExportUsersButton` in the filter bar area, passing the current `users` array

