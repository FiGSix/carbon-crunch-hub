
# Comprehensive Review: Status Migration Impact Assessment

## Executive Summary

The recent status simplification migration introduced **multiple breaking changes** that were not properly tested end-to-end. This review identifies all issues, their root causes, and provides a comprehensive fix plan.

---

## Issues Identified

### Issue 1: Frontend Hook Data Access Mismatch (CONFIRMED)
**Severity: Critical - Dashboard shows zeros**

| Aspect | Before Migration | After Migration |
|--------|-----------------|-----------------|
| Return type | `RETURNS TABLE(...)` | `RETURNS jsonb` |
| Frontend access | `data[0].field` | Should be `data.field` |

**File:** `src/hooks/dashboard/useDashboardMetricsByStage.ts` line 71
```typescript
// BROKEN: const metrics = data?.[0] || { ... };
// SHOULD BE: const metrics = data || { ... };
```

---

### Issue 2: Revenue Calculation Formula Changed (CRITICAL)
**Severity: Critical - Revenue is WRONG**

| Version | Formula | Value |
|---------|---------|-------|
| Correct (20260123172055) | `carbon_credits * 891.71` (tiered 6-year sum) | Accurate |
| Current (20260128) | `carbon_credits * 95 * 10 = 950` (flat rate) | **6.5% inflated** |

**Database verified:**
- Current formula: R 5,662,055 (95 * 10 = 950)
- Correct formula: R 5,314,643 (891.71 tiered sum)
- **Error: R 347,412 over-reported**

The correct tiered pricing per memory is:
- 2025: R97.34
- 2026: R127.03
- 2027: R143.12
- 2028: R158.79
- 2029: R174.88
- 2030: R190.55
- **Total: R891.71** (not R950)

---

### Issue 3: Onboarding MWp Logic Changed (CRITICAL)
**Severity: Critical - MWp is WRONG**

| Version | Condition | Result |
|---------|-----------|--------|
| Correct (20260123) | `onboarding_complete = false` | 67.69 MWp |
| Current (20260128) | `audit_ready = false` | 56.44 MWp |
| **Difference** | Wrong field used | **11.25 MWp missing** |

The previous function correctly used `onboarding_complete = false OR onboarding_complete IS NULL` to identify projects still in onboarding. The new function incorrectly uses `audit_ready = false`, which excludes projects where `onboarding_complete = true` but `audit_ready = false` (i.e., projects that finished onboarding but aren't audit-ready yet).

---

### Issue 4: Role-Based Revenue Removed (MEDIUM)
**Severity: Medium - Admin sees wrong perspective**

The correct function (20260123172055) calculated revenue differently per role:
- **Client**: `carbon_credits * price * client_share%`
- **Agent**: `carbon_credits * price * agent_commission%`
- **Admin**: `carbon_credits * price * (100 - client% - agent%)` (platform revenue)

The current function (20260128) uses a flat formula for all roles:
```sql
(p.carbon_credits * 95 * 10) * (1 - (client_share_percentage / 100.0))
```

This means:
- Clients see wrong revenue (should see their share, not platform share)
- Agents see wrong revenue (should see their commission, not platform share)
- Admins see platform revenue, which happens to be correct but uses wrong formula

---

### Issue 5: Edge Functions Still Using 'pending' Status (MEDIUM)
**Severity: Medium - Legacy projects created with invalid status**

| File | Issue |
|------|-------|
| `supabase/functions/create-legacy-project/index.ts` | Creates proposals with `status: 'pending'` (line 122) |
| `supabase/functions/generate-proposal-pdf/index.ts` | Checks for `status === 'pending'` (line 1534, 1539) |

Per the status redesign, 'pending' was eliminated. New proposals should use:
- `draft` (initial state)
- `sent` (after invitation sent)

---

### Issue 6: Deprecated Hook Still References 'pending' (LOW)
**Severity: Low - Deprecated code**

`src/hooks/dashboard/useOptimizedDashboardStats.ts` line 24:
```typescript
if (proposal.status === 'pending' || proposal.status === 'draft') {
```

This hook is marked `@deprecated` but may still be used somewhere.

---

### Issue 7: ProposalInviteButton References 'pending' (MEDIUM)
**Severity: Medium - UI logic affected**

`src/components/proposals/components/ProposalInviteButton.tsx` lines 109, 132, 155:
```typescript
if ((proposal.status === "draft" || proposal.status === "pending") && !proposal.invitation_sent_at) {
if ((proposal.status === "pending" || proposal.status === "sent") && proposal.invitation_sent_at && ...
```

Since 'pending' no longer exists, these conditions may never match correctly.

---

## Root Cause Analysis

The migration on 2026-01-28 (`20260128125001`) was intended to restore the missing `audit_review_requests` field but:

1. **Rewrote the entire function** instead of just adding the missing field
2. **Changed the return type** from `TABLE(...)` to `jsonb`
3. **Changed the revenue formula** from `891.71` tiered to `95 * 10` flat
4. **Changed the onboarding condition** from `onboarding_complete` to `audit_ready`
5. **Removed role-based revenue calculations**
6. **Did not update the frontend hook** to match the new return type

The correct previous version was `20260123172055` which had:
- Correct tiered pricing (891.71)
- Correct onboarding logic (onboarding_complete = false)
- Role-based revenue calculations
- TABLE return type (compatible with frontend)

---

## Comprehensive Fix Plan

### Step 1: Restore Correct Database Function
Create a migration that:
1. Drops the broken function
2. Recreates with `RETURNS TABLE(...)` format
3. Uses correct tiered pricing (891.71)
4. Uses correct onboarding logic (onboarding_complete = false)
5. Includes role-based revenue calculations
6. Includes the audit_review_requests field

### Step 2: Update Frontend Hook
Remove the `[0]` array access since TABLE format returns an array:
```typescript
// Line 71 - Keep as data?.[0] since TABLE returns array
const metrics = data?.[0] || { ... };
```

Actually, if we restore the TABLE format, the current frontend code is correct. The issue is the jsonb return type doesn't return an array.

### Step 3: Fix Edge Functions
Update `create-legacy-project/index.ts`:
```typescript
// Change from: status: 'pending'
// To: status: 'draft'
```

### Step 4: Fix ProposalInviteButton
Update to use new status lifecycle:
```typescript
// Replace 'pending' with appropriate new statuses
if ((proposal.status === "draft" || proposal.status === "sent") && !proposal.invitation_sent_at) {
```

### Step 5: Fix generate-proposal-pdf
Update to use new status lifecycle:
```typescript
// Replace 'pending' with 'sent' or other appropriate status
if ((proposal.status === 'sent' || proposal.status === 'draft') && proposal.invitation_token ...
```

---

## Files Requiring Changes

| File | Change Type |
|------|-------------|
| SQL Migration | Restore correct function with TABLE return, 891.71 pricing, onboarding_complete logic |
| `supabase/functions/create-legacy-project/index.ts` | Change `'pending'` to `'draft'` |
| `supabase/functions/generate-proposal-pdf/index.ts` | Remove `'pending'` references |
| `src/components/proposals/components/ProposalInviteButton.tsx` | Remove `'pending'` references |

---

## Verification Tests Required

| Test | Expected Result |
|------|-----------------|
| Dashboard loads as admin | All 6 cards show values |
| Onboarding MWp | 67.69 MWp (not 56.44) |
| Audit Ready Revenue | R 5,314,643 (not R 5,662,055) |
| Audit Review Requests | Shows count of submitted_for_review=true projects |
| Client dashboard revenue | Shows client's share, not platform share |
| Agent dashboard revenue | Shows agent's commission, not platform share |
| Create legacy project | Creates with status 'draft' |
| PDF generation | Works for draft/sent proposals |
| Proposal invite button | Shows correct options for all statuses |

---

## Lessons Learned

1. **Never rewrite entire functions** when adding a single field - use CREATE OR REPLACE with minimal changes
2. **Compare migration output against previous version** before deploying
3. **Test ALL metric values** after ANY database function changes, not just "does it load"
4. **Verify calculation formulas match documented business rules** (891.71 vs 950)
5. **Search for status references** across entire codebase when changing status lifecycle
6. **End-to-end testing is mandatory** - checking database returns doesn't verify frontend displays correctly
