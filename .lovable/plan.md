
# Fix Client Search Security for Proposal Creation

## Problem

When agents create proposals and search for clients to pre-populate information, they can currently see client details from agents in **different companies**. This is a data leak issue.

### Security Gaps Found

| Data Source | Current Behavior | Expected Behavior |
|-------------|------------------|-------------------|
| `profiles` table (registered clients) | All agents see all client profiles | Agents only see clients linked to their company's proposals |
| `clients` table (contacts) | Agents see own clients + proposal-linked clients | Same as now, plus team members' clients |

## Root Cause

The `search_clients` RPC function has two problems:
1. **Profiles section**: Allows any agent to see any client profile (`current_user_role IN ('admin', 'agent')`)
2. **Clients section**: Correctly restricts to own clients but doesn't include company team visibility

## Solution

Update the `search_clients` RPC function to:

1. **Restrict profiles access**: Agents can only see client profiles if:
   - The client has a proposal owned by the agent, OR
   - The client has a proposal owned by a team member in the same company

2. **Add company visibility to clients**: Agents can see clients if:
   - They created the client, OR
   - They have a proposal for the client, OR
   - A team member in their company created the client or has a proposal for them

## Implementation

### Migration File
Create: `supabase/migrations/[timestamp]_fix_client_search_company_visibility.sql`

### Updated Access Logic

For **profiles** (registered clients):
```sql
-- Old: All agents see all
current_user_role IN ('admin', 'agent')

-- New: Agents only see clients linked to their company's proposals
current_user_role = 'admin'
OR (
  current_user_role = 'agent' 
  AND p.id IN (
    SELECT DISTINCT COALESCE(pr.client_id, pr.client_reference_id)
    FROM proposals pr
    JOIN company_members cm1 ON cm1.user_id = current_user_id AND cm1.status = 'active'
    JOIN company_members cm2 ON cm2.company_id = cm1.company_id AND cm2.status = 'active'
    WHERE pr.agent_id = cm2.user_id
      AND pr.deleted_at IS NULL
  )
)
```

For **clients** table (contacts):
```sql
-- Old: Only own clients or proposal-linked
c.created_by = current_user_id
OR c.id IN (SELECT FROM proposals WHERE agent_id = current_user_id...)

-- New: Include company team members
current_user_role = 'admin'
OR c.created_by = current_user_id
OR c.id IN (
  SELECT DISTINCT COALESCE(pr.client_reference_id, pr.client_id)
  FROM proposals pr
  JOIN company_members cm1 ON cm1.user_id = current_user_id AND cm1.status = 'active'
  JOIN company_members cm2 ON cm2.company_id = cm1.company_id AND cm2.status = 'active'
  WHERE pr.agent_id = cm2.user_id
    AND pr.deleted_at IS NULL
    AND COALESCE(pr.client_reference_id, pr.client_id) IS NOT NULL
)
```

## Technical Notes

### Consistency with Proposal Visibility
This fix aligns client search visibility with the proposal visibility rules we just fixed:
- If you can see a proposal (yours or team member's), you can search for the associated client
- Prevents cross-company data leakage

### Performance Consideration
The company membership subquery uses the same pattern as the proposal RPC functions, which is efficient with existing indexes on `company_members(user_id, status)`.

### Audit Logging
The existing `log_client_access` call will continue to work, providing an audit trail of who searched for which clients.

## Expected Outcome

| Scenario | Before Fix | After Fix |
|----------|-----------|-----------|
| Agent A (Company X) searches "John" | Sees John from Company X AND Company Y | Only sees John from Company X |
| Agent A searches for team member's client | Works (own proposals only) | Works (team proposals included) |
| Admin searches for any client | Works | Works (unchanged) |

## Files Changed
1. New migration: `supabase/migrations/[timestamp]_fix_client_search_company_visibility.sql`

## Testing
After deployment, verify:
1. Agent from MiSolar cannot see clients belonging to agents from other companies
2. Agent from MiSolar CAN see clients belonging to their MiSolar team members
3. Admin still sees all clients
