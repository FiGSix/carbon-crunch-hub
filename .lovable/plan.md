

## Summary

The proposal list UI is failing to display several important statuses including **"Stale"**, **"Audit Ready"**, **"Review"**, and **"Onboarding"**. This is caused by two interconnected issues in the data pipeline.

---

## Root Cause Analysis

### Issue 1: Missing Fields in Data Transformer
The `simplifiedTransformers.ts` file does not include critical onboarding and engagement fields when transforming proposal data:

**Missing from the return object (line 80-115):**
- `engagement_count`
- `last_engagement_at` 
- `onboarding_complete`
- `submitted_for_review`
- `admin_validated`
- `audit_ready`

The data **is fetched** from the database via the query builder (which correctly joins `project_onboarding`), but it gets **dropped during transformation**.

### Issue 2: Missing "Stale" Status Check in UI
The `ProposalList.tsx` status badge logic (lines 62-102) uses a priority chain that **never checks for `status === 'stale'`**:

```
Current priority order:
1. audit_ready → "Audit"
2. submitted_for_review → "Review"  
3. onboarding_complete → "Onboarding"
4. signed_at → "Signed"
5. status === 'approved' → "Approved"
6. status === 'rejected' → "Rejected"
7. last_email_event_type → Email badge (Delivered/Opened/Clicked)
8. invitation_sent_at → "Sent"
9. default → "Draft"
```

When `status === 'stale'` but `last_email_event_type` exists (80 of 130 stale proposals), the email badge takes priority. The remaining 50 stale proposals fall through to "Draft".

### Issue 3: Incomplete Memo Comparison
The `MemoizedProposalRow` comparison function (lines 130-139) doesn't check for changes in `audit_ready`, `submitted_for_review`, or `onboarding_complete`, which could cause stale UI when these values update.

---

## Database Status Summary

| Status | Count | With Email Tracking |
|--------|-------|---------------------|
| draft | 643 | 1 |
| **stale** | **130** | **80** |
| approved | 78 | 26 |
| signed | 38 | 0 |
| delivered | 16 | 16 |
| sent | 5 | 0 |
| bounced | 1 | 1 |

| Onboarding Status | Count |
|-------------------|-------|
| **audit_ready = true** | **20** |
| submitted_for_review = true | 8+ |
| onboarding_complete = true | 12+ |

---

## Solution

### Step 1: Update Data Transformer

**File:** `src/utils/proposals/simplifiedTransformers.ts`

Add the missing fields to the returned object in `transformToProposalListItems`:

```typescript
// Add after line 114 (last_email_sent_at):
engagement_count: proposal.engagement_count,
last_engagement_at: proposal.last_engagement_at,
onboarding_complete: proposal.onboarding_complete,
submitted_for_review: proposal.submitted_for_review,
admin_validated: proposal.admin_validated,
audit_ready: proposal.audit_ready,
```

### Step 2: Fix Status Badge Priority Order

**File:** `src/components/proposals/ProposalList.tsx`

Update the conditional chain (lines 62-102) to check for `stale` status **before** email engagement:

```text
New priority order:
1. audit_ready → "Audit"
2. submitted_for_review → "Review"  
3. onboarding_complete → "Onboarding"
4. signed_at → "Signed"
5. status === 'approved' → "Approved"
6. status === 'rejected' → "Rejected"
7. ★ NEW: status === 'stale' → "Stale" (gray badge)
8. last_email_event_type → Email badge
9. invitation_sent_at → "Sent"
10. default → "Draft"
```

Add the stale status check after the `rejected` check:

```tsx
) : proposal.status === 'stale' ? (
  <Badge variant="outline" className="gap-1 text-xs bg-gray-100 text-gray-500 border-gray-300">
    Stale
  </Badge>
)
```

### Step 3: Update Memo Comparison Function

**File:** `src/components/proposals/ProposalList.tsx`

Extend the comparison function (lines 130-139) to include onboarding fields:

```typescript
return (
  prevProps.proposal.id === nextProps.proposal.id &&
  prevProps.proposal.status === nextProps.proposal.status &&
  prevProps.proposal.last_email_event_type === nextProps.proposal.last_email_event_type &&
  prevProps.proposal.engagement_count === nextProps.proposal.engagement_count &&
  prevProps.proposal.audit_ready === nextProps.proposal.audit_ready &&
  prevProps.proposal.submitted_for_review === nextProps.proposal.submitted_for_review &&
  prevProps.proposal.onboarding_complete === nextProps.proposal.onboarding_complete &&
  prevProps.proposal.signed_at === nextProps.proposal.signed_at &&
  prevProps.userRole === nextProps.userRole &&
  prevProps.isCurrentUser === nextProps.isCurrentUser
);
```

---

## Files Changed

| File | Changes |
|------|---------|
| `src/utils/proposals/simplifiedTransformers.ts` | Add 6 missing fields to return object |
| `src/components/proposals/ProposalList.tsx` | Add stale status check + update memo comparison |

---

## Expected Results After Fix

- **130 stale proposals** will display "Stale" badge (gray)
- **20 audit_ready proposals** will display "Audit" badge (indigo)
- **8+ submitted_for_review proposals** will display "Review" badge (violet)
- All onboarding statuses will render correctly
- Component will properly re-render when these fields change

