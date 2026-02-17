

## Fix: Texiwell Company Members Can't See Proposals

### Problem
Kobie Vorster and Shaida Cara (both members of Texiwell Investments) cannot see the company's projects on their dashboard. All 10 proposals are linked to Dr Mohammed Essa's client record (`client_reference_id`), and the current RPC functions only check direct `user_id` match -- not company membership.

### Root Cause
The two main database RPC functions used for the dashboard and proposals list (`search_proposals_optimized` and `get_dashboard_stats_optimized`) have a client visibility filter that is too narrow:

```text
Current (broken):
  clients.user_id = current_user_id

Needed:
  clients.user_id = current_user_id
  OR clients.client_company_id IN (user's active client company memberships)
```

The RLS policies on the `proposals` table already handle company visibility correctly via `get_user_client_company_client_ids()`, but the RPC functions apply their own restrictive WHERE clause that filters out the company-level matches.

### Fix

Update both RPC functions to include company-level client visibility for the `'client'` role case.

**1. Update `search_proposals_optimized`**

Change the client filter from:
```sql
WHEN 'client' THEN (
  p.client_id = user_id_param 
  OR p.client_reference_id IN (
    SELECT id FROM clients WHERE user_id = user_id_param
  )
)
```
to:
```sql
WHEN 'client' THEN (
  p.client_id = user_id_param 
  OR p.client_reference_id IN (
    SELECT id FROM clients WHERE user_id = user_id_param
  )
  OR p.client_reference_id IN (
    SELECT c.id FROM clients c
    WHERE c.client_company_id IN (
      SELECT ccm.client_company_id 
      FROM client_company_members ccm 
      WHERE ccm.user_id = user_id_param 
        AND ccm.status = 'active'
    )
  )
)
```

**2. Update `get_dashboard_stats_optimized`**

Apply the same company-visibility change to the client filter in this function.

**3. Update `get_dashboard_metrics_by_stage` (if it exists)**

Check and apply the same fix to any other RPC functions with client filtering.

### No frontend changes needed
The frontend `ProposalsDataService.ts` already has the correct company-aware logic, and the RLS policies are correct. Only the RPC functions need updating.

### Impact
- Kobie and Shaida will immediately see all 10 Texiwell proposals
- Dashboard stats will correctly reflect the company's full portfolio
- No security risk: company membership is validated through `client_company_members` with active status check
