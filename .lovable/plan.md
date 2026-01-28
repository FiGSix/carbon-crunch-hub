
# Proposal Status Simplification & Stale Status Implementation

## Executive Summary

This plan eliminates the redundant `pending` status, keeps `draft` as the creation state, and introduces a `stale` status for proposals with no activity for 10 working days. The goal is a cleaner, more intuitive proposal lifecycle that agents and admins can understand at a glance.

## Current State Analysis

### Existing Proposal Statuses in Database
| Status | Count | Purpose |
|--------|-------|---------|
| pending | 642 | Confusing intermediate state - proposals "waiting" |
| approved | 65 | Client accepted |
| stale | 61 | Already exists! 10 days no activity |
| draft | 46 | Created but not sent |
| signed | 38 | Cession agreement signed |
| sent | 33 | Email dispatched |
| delivered | 26 | Email confirmed delivered |
| bounced | 1 | Email bounced |

### Problem with `pending`
1. **Confusing**: Currently used to mean "waiting for review" but UI labels it as "Sent"
2. **Redundant**: `draft` already represents "not yet sent"
3. **Inconsistent**: Code uses `pending` and `sent` interchangeably in places
4. **Data debt**: 642 proposals stuck in `pending` need migration

## Proposed Lifecycle

```text
NEW PROPOSAL LIFECYCLE:

    +-------+      Email Sent      +------+      Delivered       +-----------+
    | draft | ------------------>  | sent | ------------------>  | delivered |
    +-------+                      +------+                      +-----------+
                                      |                               |
                                      |      10 working days          |
                                      |      no activity              |
                                      v                               v
                                  +-------+                       +--------+
                                  | stale | <-------------------- | opened |
                                  +-------+                       +--------+
                                      ^                               |
                                      |                               v
                                      |                          +--------+
                                      +------------------------- | viewed |
                                                                 +--------+
                                                                      |
                                              +----------+            |
                                              | approved | <----------+
                                              +----------+            |
                                                   |                  v
                                              +--------+         +----------+
                                              | signed | <------ | rejected |
                                              +--------+         +----------+
```

## Implementation Phases

---

## Phase 1: Database Schema & Data Migration

### 1.1 Migration Script for Existing Data
Migrate all `pending` proposals to appropriate statuses:

```sql
-- Step 1: Proposals with invitation_sent_at should be 'sent' (was actually sent)
UPDATE proposals 
SET status = 'sent'
WHERE status = 'pending' 
  AND invitation_sent_at IS NOT NULL
  AND deleted_at IS NULL;

-- Step 2: Proposals never sent should be 'draft'
UPDATE proposals 
SET status = 'draft'
WHERE status = 'pending' 
  AND invitation_sent_at IS NULL
  AND deleted_at IS NULL;
```

### 1.2 Update Database Function
Update `get_dashboard_metrics_by_stage` to remove `pending` from status lists:

**File:** SQL Migration

Replace:
```sql
status IN ('pending', 'draft', 'sent', 'delivered', 'opened', 'stale')
```

With:
```sql
status IN ('draft', 'sent', 'delivered', 'opened', 'viewed', 'stale')
```

### 1.3 Verify `stale` Status Already Exists
The database already has 61 proposals with `stale` status and the `proposal-automation` edge function already handles marking proposals as stale after 10 days.

---

## Phase 2: Edge Functions Updates

### 2.1 `send-proposal-invitation/index.ts`
**Current behavior:** Sets status to `sent` (line 203) - NO CHANGE NEEDED

### 2.2 `resend-webhook/index.ts`
**Update required:** Remove `pending` from status transition checks

**Lines 212-226 changes:**
```typescript
// BEFORE:
if (['sent', 'pending'].includes(proposal.status)) {
  newStatus = 'delivered';
}
if (['sent', 'delivered', 'pending'].includes(proposal.status)) {
  newStatus = 'opened';
}
if (['sent', 'delivered', 'opened', 'pending'].includes(proposal.status)) {
  newStatus = 'viewed';
}

// AFTER:
if (['sent', 'draft'].includes(proposal.status)) {
  newStatus = 'delivered';
}
if (['sent', 'delivered', 'draft'].includes(proposal.status)) {
  newStatus = 'opened';
}
if (['sent', 'delivered', 'opened', 'draft'].includes(proposal.status)) {
  newStatus = 'viewed';
}
```

### 2.3 `generate-proposal-pdf/index.ts`
**Update required:** Replace `pending` checks with `draft`

**Lines 74-77 and 1531-1538:**
```typescript
// BEFORE:
if (proposal.status === 'pending' || proposal.status === 'draft')

// AFTER:
if (proposal.status === 'draft')
```

### 2.4 `accept-proposal/index.ts`
**Update required:** Line 386 - Remove `pending` from exclusion list

```typescript
// BEFORE:
.in('status', ['draft', 'pending', 'sent'])

// AFTER:
.in('status', ['draft', 'sent', 'delivered', 'opened', 'viewed'])
```

### 2.5 `proposal-automation/index.ts`
**Current behavior:** Already handles `stale` status correctly (lines 139-196)
**Update:** Remove any `pending` references if present

### 2.6 `create-legacy-project/index.ts` and `bulk-upload-proposals/index.ts`
**Update required:** Change default status from `pending` to `draft`

```typescript
// BEFORE:
status: 'pending'

// AFTER:
status: 'draft'
```

---

## Phase 3: Frontend Status Components

### 3.1 `ProposalStatusBadge.tsx`
**File:** `src/components/proposals/components/ProposalStatusBadge.tsx`

Add badge styling for all statuses including `stale`:

```typescript
// Add these cases to the switch statement:
case "sent":
  return {
    className: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    text: "Sent"
  };
case "delivered":
  return {
    className: "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100",
    text: "Delivered"
  };
case "opened":
  return {
    className: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
    text: "Opened"
  };
case "viewed":
  return {
    className: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
    text: "Viewed"
  };
case "stale":
  return {
    className: "bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200",
    text: "Stale"
  };
case "bounced":
  return {
    className: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
    text: "Bounced"
  };

// REMOVE the 'pending' case entirely
```

### 3.2 `ProposalStatusDropdown.tsx`
**File:** `src/components/proposals/components/ProposalStatusDropdown.tsx`

Update STATUS_OPTIONS to remove `pending`:

```typescript
// BEFORE:
const STATUS_OPTIONS = [
  { value: "pending", label: "Sent" },
  { value: "rejected", label: "Declined" },
  { value: "approved", label: "Accepted" },
] as const;

// AFTER:
const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "stale", label: "Stale" },
  { value: "rejected", label: "Declined" },
  { value: "approved", label: "Accepted" },
] as const;
```

### 3.3 `ProposalFilters.tsx`
**File:** `src/components/proposals/ProposalFilters.tsx`

Update filter options:

```tsx
// BEFORE:
<SelectItem value="pending">Pending</SelectItem>

// AFTER - Replace with full status list:
<SelectItem value="draft">Draft</SelectItem>
<SelectItem value="sent">Sent</SelectItem>
<SelectItem value="delivered">Delivered</SelectItem>
<SelectItem value="opened">Opened</SelectItem>
<SelectItem value="viewed">Viewed</SelectItem>
<SelectItem value="stale">Stale</SelectItem>
```

### 3.4 `AdvancedProposalFilters.tsx`
**File:** `src/components/proposals/filters/AdvancedProposalFilters.tsx`

Verify email status filter includes all statuses (currently looks correct)

---

## Phase 4: ACTIONABLE_STATUSES Arrays

### 4.1 `useProposalStatus.ts`
**File:** `src/hooks/proposals/view/useProposalStatus.ts`

Update ACTIONABLE_STATUSES to remove `pending` and include `stale`:

```typescript
// BEFORE:
const ACTIONABLE_STATUSES = ['pending', 'sent', 'delivered', 'opened', 'viewed'];

// AFTER:
const ACTIONABLE_STATUSES = ['draft', 'sent', 'delivered', 'opened', 'viewed', 'stale'];
```

### 4.2 `useViewProposalAuth.ts`
**File:** `src/pages/ViewProposal/hooks/useViewProposalAuth.ts`

Update showSignInPrompt logic:

```typescript
// BEFORE:
proposal?.status === 'pending' && !proposal?.archived_at && !proposal?.review_later_until;

// AFTER:
const ACTIONABLE_STATUSES = ['draft', 'sent', 'delivered', 'opened', 'viewed', 'stale'];
ACTIONABLE_STATUSES.includes(proposal?.status || '') && 
  !proposal?.archived_at && 
  !proposal?.review_later_until &&
  !proposal?.signed_at;
```

---

## Phase 5: Service Layer Updates

### 5.1 `statusUpdateService.ts`
**File:** `src/services/proposals/statusUpdateService.ts`

Update valid statuses:

```typescript
// BEFORE:
const validStatuses = ['draft', 'pending', 'approved', 'rejected'];

// AFTER:
const validStatuses = ['draft', 'sent', 'delivered', 'opened', 'viewed', 'stale', 'approved', 'rejected', 'bounced'];
```

### 5.2 `ReliableProposalService.ts`
**File:** `src/services/proposals/ReliableProposalService.ts`

Remove the `pending` status update in `submitProposalReliably`:

```typescript
// Lines 265-273 - Remove or change:
// BEFORE: 
const updateResult = await updateProposalStatus(proposalId, 'pending', userId);
return { proposalId, status: 'pending' };

// AFTER: 
// Keep proposal in 'draft' status until actually sent
// The status will change to 'sent' when email is dispatched
return { proposalId, status: 'draft' };
```

### 5.3 `useProposalInvitations.ts`
**File:** `src/components/proposals/hooks/useProposalInvitations.ts`

Remove auto-promotion from draft to pending:

```typescript
// Lines 109-139 - Remove the entire block that promotes draft to pending
// The status should only change to 'sent' when the email is actually sent
// (which happens in send-proposal-invitation edge function)
```

### 5.4 `UnifiedDashboardCalculations.ts`
**File:** `src/services/dashboard/UnifiedDashboardCalculations.ts`

Update status counting:

```typescript
// BEFORE:
if (proposal.status === 'pending' || proposal.status === 'draft') {
  acc.pendingProposals++;
}

// AFTER:
const UNSIGNED_STATUSES = ['draft', 'sent', 'delivered', 'opened', 'viewed', 'stale'];
if (UNSIGNED_STATUSES.includes(proposal.status)) {
  acc.pendingProposals++;
}
```

### 5.5 `useDashboardData.ts`
**File:** `src/hooks/useDashboardData.ts`

Update filter predicate:

```typescript
// BEFORE:
const isPending = useCallback((p: any) => p.status === 'pending', []);

// AFTER:
const UNSIGNED_STATUSES = ['draft', 'sent', 'delivered', 'opened', 'viewed', 'stale'];
const isPending = useCallback((p: any) => UNSIGNED_STATUSES.includes(p.status), []);
```

---

## Phase 6: Type Definitions Updates

### 6.1 `src/types/api.ts`
**Update ProposalStatus type:**

```typescript
// BEFORE:
export type ProposalStatus = 'draft' | 'pending' | 'review_later' | 'signed' | 'archived' | 'deleted';

// AFTER:
export type ProposalStatus = 
  | 'draft'      // Created, not yet sent
  | 'sent'       // Email dispatched
  | 'delivered'  // Email confirmed delivered
  | 'opened'     // Client opened email
  | 'viewed'     // Client viewed proposal
  | 'stale'      // 10 working days no activity
  | 'approved'   // Client accepted
  | 'rejected'   // Client declined
  | 'signed'     // Cession agreement signed
  | 'bounced'    // Email bounced
  | 'archived'   // Manually archived
  | 'deleted';   // Soft deleted
```

### 6.2 `src/types/supabase.ts`
**Update status type in Proposal definitions:**

```typescript
// Lines 112, 141, 170 - Update status type to match new values
```

---

## Phase 7: Testing Checklist

### 7.1 Database Tests
- [ ] Run migration on test environment
- [ ] Verify all 642 `pending` proposals migrated correctly
- [ ] Verify `get_dashboard_metrics_by_stage` returns correct values

### 7.2 Edge Function Tests
| Function | Test Case | Expected Result |
|----------|-----------|-----------------|
| send-proposal-invitation | Send to draft proposal | Status becomes `sent` |
| resend-webhook | Delivered event on sent proposal | Status becomes `delivered` |
| resend-webhook | Opened event | Status becomes `opened` |
| generate-proposal-pdf | Generate for draft proposal | Token included in PDF |
| proposal-automation | 10 days no activity | Status becomes `stale` |
| accept-proposal | Sign stale proposal | Status becomes `approved` |

### 7.3 Frontend Tests
- [ ] ProposalStatusBadge renders all statuses correctly
- [ ] ProposalStatusDropdown shows new options
- [ ] ProposalFilters includes all status options
- [ ] Dashboard metrics display correctly
- [ ] Sign-in prompt shows for all actionable statuses
- [ ] Client can sign proposals in `stale` status after resend

### 7.4 End-to-End Flow Tests
1. **Create proposal** → Status should be `draft`
2. **Send invitation** → Status should change to `sent`
3. **Email delivered** (webhook) → Status should change to `delivered`
4. **Client opens email** (webhook) → Status should change to `opened`
5. **Client views proposal** → Status should change to `viewed`
6. **No activity 10 days** → Status should change to `stale`
7. **Resend stale proposal** → Status should revert to `sent`
8. **Client signs** → Status should change to `approved`/`signed`

---

## Summary of Files to Modify

| File | Type | Change |
|------|------|--------|
| SQL Migration | Database | Migrate `pending` to `sent`/`draft` |
| `get_dashboard_metrics_by_stage` | Database Function | Remove `pending` from lists |
| `resend-webhook/index.ts` | Edge Function | Update status transition checks |
| `generate-proposal-pdf/index.ts` | Edge Function | Replace `pending` with `draft` |
| `accept-proposal/index.ts` | Edge Function | Update status list |
| `create-legacy-project/index.ts` | Edge Function | Change default to `draft` |
| `bulk-upload-proposals/index.ts` | Edge Function | Change default to `draft` |
| `ProposalStatusBadge.tsx` | Frontend | Add new status styles, remove `pending` |
| `ProposalStatusDropdown.tsx` | Frontend | Update dropdown options |
| `ProposalFilters.tsx` | Frontend | Update filter options |
| `useProposalStatus.ts` | Hook | Update ACTIONABLE_STATUSES |
| `useViewProposalAuth.ts` | Hook | Update sign-in prompt logic |
| `statusUpdateService.ts` | Service | Update valid statuses |
| `ReliableProposalService.ts` | Service | Remove pending status update |
| `useProposalInvitations.ts` | Hook | Remove draft-to-pending promotion |
| `UnifiedDashboardCalculations.ts` | Service | Update status counting |
| `useDashboardData.ts` | Hook | Update filter predicate |
| `src/types/api.ts` | Types | Update ProposalStatus type |

---

## Rollback Plan

If issues arise:
1. Revert database migration with inverse query
2. Deploy previous edge function versions
3. Revert frontend changes via Git

All changes are additive/modifying existing logic - no destructive schema changes required.
