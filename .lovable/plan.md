
# Restore Dashboard "Pending Approval" Metrics

## Problem Summary

At approximately **12:16 UTC today**, migration `20260123121646` was applied. While this migration correctly added company visibility for agents, it **accidentally corrupted** the business logic for the "Pending Approval" dashboard metrics.

### The Error

| Metric | Correct Logic (Before) | Broken Logic (After) |
|--------|------------------------|---------------------|
| Card 5: Pending Approval MWp | `signed_at IS NULL AND status IN (pending, draft, sent, delivered, opened, stale)` | `signed_at IS NOT NULL AND admin_validated = true AND NOT audit_ready` |
| Card 6: Pending Approval Revenue | Same as Card 5 | Same as broken Card 5 |

### Impact

| Metric | Before Migration | After Migration |
|--------|-----------------|-----------------|
| Pending Approval MWp | **140+ MWp** | **1.55 MWp** |

The migration flipped the logic from "unsigned proposals awaiting client signature" to "already-signed proposals awaiting admin validation" — completely different meanings.

---

## Solution

Create a corrective migration that restores the original "Pending Approval" logic while preserving the company visibility improvements.

### Files to Create

**1. New Migration File**
`supabase/migrations/[timestamp]_restore_pending_approval_metrics.sql`

### Changes to the Function

The `get_dashboard_metrics_by_stage` function will be restored with:

**Card 5 - Pending Approval MWp (RESTORED)**
```text
Condition: signed_at IS NULL 
           AND status IN ('pending', 'draft', 'sent', 'delivered', 'opened', 'stale')
           
Meaning: All unsigned proposals awaiting client signature action
```

**Card 6 - Pending Approval Revenue (RESTORED)**
```text
Same condition as Card 5
Uses role-based revenue calculation (client/agent/admin share percentages)
```

**All Other Cards - UNCHANGED**
- Card 1 (Audit Ready MWp): `signed_at IS NOT NULL AND audit_ready = true`
- Card 2 (Audit Ready Revenue): Same as Card 1
- Card 3 (Audit Review Requests): `signed_at IS NOT NULL AND submitted_for_review = true AND NOT audit_ready AND NOT admin_validated`
- Card 4 (Onboarding MWp): `signed_at IS NOT NULL AND NOT onboarding_complete`

### Company Visibility - PRESERVED

The corrective migration will maintain the company membership visibility logic added today, so agents can still see their team members' proposals.

---

## Expected Outcome

After applying this fix:

| Metric | Current Value | After Fix |
|--------|--------------|-----------|
| Pending Approval MWp | 1.55 MWp | **140+ MWp** |
| Pending Approval Revenue | Minimal | Full pipeline revenue |
| Audit Ready MWp | Unchanged | Unchanged |
| Onboarding MWp | Unchanged | Unchanged |

---

## Technical Details

### Root Cause Analysis

The migration `20260123121646_7678bd60-1b24-4a72-836e-83b712084d07.sql` was generated to add company visibility but:

1. It included a complete rewrite of `get_dashboard_metrics_by_stage`
2. The rewrite did not reference the existing correct logic from migration `20251217180913`
3. Cards 5 and 6 were incorrectly redefined with inverted signing conditions

### Correct Business Logic Documentation

Per the memory `workflows/pending-approval-metric-includes-all-unsigned-proposals`:

> The "Pending Approval MWp" and "Pending Approval Revenue" dashboard metrics now include all unsigned proposals awaiting client action, not just draft and pending statuses. Metric includes proposals with status IN ('pending', 'draft', 'sent', 'delivered', 'opened', 'stale').

This confirms the correct logic should use `signed_at IS NULL` with the expanded status list.
