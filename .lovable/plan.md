

# Fix Company Visibility in Proposal RPC Functions

## Problem Summary

Greg from MiSolar cannot see the "Jackal River Farm" project owned by Sally (his team member) because the RPC functions use hardcoded filtering that doesn't respect company membership, while the RLS policies correctly allow team visibility.

**Root Cause**: Three database RPC functions bypass RLS and implement their own access control logic. The `'agent'` case only checks `p.agent_id = user_id_param` instead of including team members from the same company.

## Current vs Expected Behavior

| Scenario | RLS Policies | RPC Functions |
|----------|-------------|---------------|
| Agent sees own proposals | Works | Works |
| Agent sees team member proposals | Works | Does NOT work |

## Functions to Update

Three RPC functions need the same fix:

1. `search_proposals_optimized` - Used for proposal listing/search
2. `get_dashboard_stats_optimized` - Used for dashboard statistics
3. `get_dashboard_metrics_by_stage` - Used for stage-based metrics

## Implementation Plan

### Step 1: Create New Migration File

Create a new SQL migration that updates all three functions to use company membership logic consistent with RLS policies.

**File**: `supabase/migrations/[timestamp]_fix_agent_company_visibility.sql`

### Step 2: Updated Access Logic

Replace the current agent filter:
```sql
WHEN 'agent' THEN p.agent_id = user_id_param
```

With company-aware filter (matching RLS policy):
```sql
WHEN 'agent' THEN (
  p.agent_id = user_id_param
  OR EXISTS (
    SELECT 1
    FROM company_members cm1
    JOIN company_members cm2 ON cm1.company_id = cm2.company_id
    WHERE cm1.user_id = user_id_param
      AND cm2.user_id = p.agent_id
      AND cm1.status = 'active'
      AND cm2.status = 'active'
  )
)
```

### Step 3: Full Migration Content

```sql
-- Fix agent company visibility in RPC functions
-- Aligns RPC access control with RLS policies to allow agents 
-- to see proposals from team members in the same company

-- 1. Update search_proposals_optimized
CREATE OR REPLACE FUNCTION public.search_proposals_optimized(
  user_id_param uuid,
  user_role_param text,
  search_term text DEFAULT NULL::text,
  status_filter text DEFAULT 'all'::text,
  limit_param integer DEFAULT 20,
  offset_param integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, title text, status text, created_at timestamp with time zone,
  agent_id uuid, client_id uuid, client_reference_id uuid,
  carbon_credits numeric, system_size_kwp numeric,
  invitation_sent_at timestamp with time zone,
  invitation_viewed_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH filtered_proposals AS (
    SELECT 
      p.id, p.title, p.status, p.created_at, p.agent_id, 
      p.client_id, p.client_reference_id, p.carbon_credits,
      p.system_size_kwp, p.invitation_sent_at, p.invitation_viewed_at
    FROM proposals p
    WHERE p.deleted_at IS NULL
      AND (
        CASE user_role_param
          WHEN 'admin' THEN true
          WHEN 'agent' THEN (
            p.agent_id = user_id_param
            OR EXISTS (
              SELECT 1
              FROM company_members cm1
              JOIN company_members cm2 ON cm1.company_id = cm2.company_id
              WHERE cm1.user_id = user_id_param
                AND cm2.user_id = p.agent_id
                AND cm1.status = 'active'
                AND cm2.status = 'active'
            )
          )
          WHEN 'client' THEN (
            p.client_id = user_id_param 
            OR p.client_reference_id IN (
              SELECT id FROM clients WHERE user_id = user_id_param
            )
          )
          ELSE false
        END
      )
      AND (
        status_filter = 'all' OR
        (status_filter = 'archived' AND p.archived_at IS NOT NULL) OR
        (status_filter = 'review-later' AND p.review_later_until IS NOT NULL 
         AND p.review_later_until >= now()) OR
        (status_filter != 'archived' AND status_filter != 'review-later' 
         AND p.status = status_filter)
      )
      AND (
        search_term IS NULL OR
        p.title ILIKE '%' || search_term || '%' OR
        p.content->>'clientInfo' ILIKE '%' || search_term || '%'
      )
  )
  SELECT fp.id, fp.title, fp.status, fp.created_at, fp.agent_id,
         fp.client_id, fp.client_reference_id, fp.carbon_credits,
         fp.system_size_kwp, fp.invitation_sent_at, fp.invitation_viewed_at
  FROM filtered_proposals fp
  ORDER BY fp.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$function$;

-- 2. Update get_dashboard_stats_optimized
CREATE OR REPLACE FUNCTION public.get_dashboard_stats_optimized(
  user_id_param uuid,
  user_role_param text
)
RETURNS TABLE(
  total_proposals bigint, active_proposals bigint, signed_proposals bigint,
  total_carbon_credits numeric, total_revenue numeric, portfolio_size_kwp numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE p.status IN ('pending', 'review_later')) as active_count,
    COUNT(*) FILTER (WHERE p.status = 'signed') as signed_count,
    COALESCE(SUM(p.carbon_credits), 0) as total_credits,
    COALESCE(SUM(p.carbon_credits * p.client_share_percentage / 100), 0) as revenue,
    COALESCE(SUM(p.system_size_kwp), 0) as portfolio_kwp
  FROM proposals p
  WHERE p.deleted_at IS NULL
    AND p.archived_at IS NULL
    AND (
      CASE user_role_param
        WHEN 'admin' THEN true
        WHEN 'agent' THEN (
          p.agent_id = user_id_param
          OR EXISTS (
            SELECT 1
            FROM company_members cm1
            JOIN company_members cm2 ON cm1.company_id = cm2.company_id
            WHERE cm1.user_id = user_id_param
              AND cm2.user_id = p.agent_id
              AND cm1.status = 'active'
              AND cm2.status = 'active'
          )
        )
        WHEN 'client' THEN (
          p.client_id = user_id_param 
          OR p.client_reference_id IN (
            SELECT id FROM clients WHERE user_id = user_id_param
          )
        )
        ELSE false
      END
    );
END;
$function$;

-- 3. Update get_dashboard_metrics_by_stage 
-- (Full function preserved, only agent filter updated)
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics_by_stage(
  user_id_param uuid, 
  user_role_param text
)
RETURNS TABLE(
  audit_ready_mwp numeric, 
  audit_ready_revenue numeric, 
  audit_review_requests bigint, 
  onboarding_mwp numeric, 
  pending_approval_mwp numeric, 
  pending_approval_revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
-- [Full function body with updated agent filter]
-- The agent filter changes from:
--   WHEN 'agent' THEN p.agent_id = user_id_param
-- To:
--   WHEN 'agent' THEN (
--     p.agent_id = user_id_param
--     OR EXISTS (
--       SELECT 1 FROM company_members cm1
--       JOIN company_members cm2 ON cm1.company_id = cm2.company_id
--       WHERE cm1.user_id = user_id_param
--         AND cm2.user_id = p.agent_id
--         AND cm1.status = 'active'
--         AND cm2.status = 'active'
--     )
--   )
$function$;
```

## Technical Details

### Why This Approach

1. **Consistency**: Uses the exact same logic as the RLS policy `proposals_select_policy`
2. **Performance**: The `EXISTS` subquery is efficient with proper indexes on `company_members(user_id, status)`
3. **Maintainability**: Single source of truth for access rules (can be refactored to a helper function later)

### Existing Helper Functions

The codebase has `user_company_ids()` but using the direct `EXISTS` pattern is preferred here because:
- It matches the exact RLS policy implementation
- Avoids additional function call overhead
- Clearer intent in the code

### Impact

After this migration:
- Greg will see Sally's "Jackal River Farm" proposal
- All agents in a company will see their team's proposals in search, dashboard stats, and metrics
- Behavior will match what RLS already allows for direct table queries

## Testing Verification

After deployment, verify with this query:
```sql
-- Test as Greg (replace with his actual user_id)
SELECT * FROM search_proposals_optimized(
  'greg-user-id-here'::uuid,
  'agent',
  NULL,
  'all',
  100,
  0
);
-- Should now include Jackal River Farm
```

