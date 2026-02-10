

# Show All Users Including Potential Clients in Admin User Management

## The Problem

The admin user list currently queries only the `profiles` table, which contains **102 signed-up users**. However, the `clients` table has **220 records**, of which **178 are potential clients** (added by agents but not yet signed up). These people are invisible in the admin user management view.

## The Solution

Merge data from both `profiles` (signed-up users) and `clients` (where `user_id IS NULL` -- potential clients) into a single unified list. Add a new filter to distinguish between signed-up users and potential clients.

## What Changes

### Updated User List

The table will show two categories of people:

| Source | Count | What They Are |
|--------|-------|---------------|
| `profiles` table | 102 | Signed-up users (agents, clients, admins) |
| `clients` table (no `user_id`) | 178 | Potential clients added by agents, not yet signed up |

Potential clients will appear with:
- A **"Potential Client"** badge instead of a role badge
- A **"Not Signed Up"** status badge
- Their name, email, and company from the `clients` table
- Limited actions (no role management, but can view/delete)

### New Filter Option

Add a **"User Type"** filter alongside the existing Role and Company filters:
- **All Users** (default)
- **Signed Up** -- only profiles
- **Potential Clients** -- only clients without accounts

### Export Update

The CSV export will include potential clients too, with a "Status" column indicating whether they are signed up or not.

## Technical Details

### Files to Modify

**`src/components/admin/users/UserManagementTable.tsx`**
- Extend the query to also fetch from the `clients` table where `user_id IS NULL`
- Map potential clients into the same `UserWithRoles` interface with `role: 'potential_client'` and `agent_status: 'not_signed_up'`
- Deduplicate by email (in case a client record exists for a signed-up user)
- Add a "User Type" filter (all / signed_up / potential)
- Update the role badge logic to handle `'potential_client'`

**`src/components/admin/users/ExportUsersButton.tsx`**
- Add a "Status" column to the CSV (e.g., "Signed Up" vs "Potential Client")

### Query Approach

```text
1. Fetch all profiles (existing query, unchanged)
2. Fetch clients WHERE user_id IS NULL (new query)
3. Map potential clients into UserWithRoles format:
   - id: client record id
   - email: from clients table
   - first_name / last_name: from clients table
   - role: "potential_client"
   - agent_status: null
   - company_name: from clients table
   - created_at: from clients table
4. Merge both arrays
5. Apply filters (search, role, company, user type)
```

### Interface Update

Extend `UserWithRoles` with an optional `source` field:

```text
source?: 'profile' | 'client_record'
```

This lets the UI know which actions are available (e.g., "Manage Roles" only for signed-up users).

### Action Menu for Potential Clients

Potential clients will have a simplified action menu:
- **View** -- see their details
- **Delete** -- remove the client record
- No "Manage Roles" or "Promote to Admin" (they don't have accounts)

