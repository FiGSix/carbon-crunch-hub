

## Problem Summary

PDF regeneration does not update the proposal status, leaving revived proposals stuck in "stale" status even though they have a fresh token and the agent clearly intends to re-engage with the client.

---

## Current Behavior

| Action | Status Update | Token Renewal | `invitation_sent_at` |
|--------|--------------|---------------|---------------------|
| PDF Regeneration | ❌ None | ✅ Auto (if expired) | ❌ None |
| Email Resend | ✅ → `sent` | ✅ Fresh | ✅ Updated |

The PDF regeneration updates `pdf_generated_at` and `pdf_version` but never touches `status` or `invitation_sent_at`.

---

## Proposed Solution

When the `generate-proposal-pdf` edge function regenerates a PDF for a stale proposal, it should:

1. **Update status from `stale` to `sent`** - reflecting that the agent has actively re-engaged
2. **Update `invitation_sent_at` to now** - resetting the 10-day stale timer
3. **Log this as a "pdf_regeneration" activity** - for audit trail

### Why `sent` and not `draft`?

- `draft` implies the proposal hasn't been shared with the client yet
- When an agent regenerates a PDF to manually send to a client, the proposal IS being sent
- Using `sent` keeps the status flow consistent and prevents the stale cron from immediately re-marking it

---

## File Changes

| File | Change |
|------|--------|
| `supabase/functions/generate-proposal-pdf/index.ts` | Add status transition from `stale` → `sent` when PDF is regenerated |

---

## Technical Implementation

### Current PDF Metadata Update (Lines 179-186)

```typescript
const { error: updateError } = await supabaseAdmin
  .from('proposals')
  .update({
    pdf_url: publicUrl,
    pdf_generated_at: new Date().toISOString(),
    pdf_version: (proposal.pdf_version || 1) + 1
  })
  .eq('id', proposalId)
```

### Proposed Enhanced Update

```typescript
// Build update payload with PDF metadata
const updatePayload: Record<string, any> = {
  pdf_url: publicUrl,
  pdf_generated_at: new Date().toISOString(),
  pdf_version: (proposal.pdf_version || 1) + 1
};

// If proposal was stale, revive it when PDF is regenerated
// This signals the agent has actively re-engaged with this proposal
if (proposal.status === 'stale') {
  console.log(`[PDF] Reviving stale proposal ${proposalId} - agent regenerated PDF`);
  updatePayload.status = 'sent';
  updatePayload.invitation_sent_at = new Date().toISOString();
  updatePayload.last_email_sent_at = new Date().toISOString();
}

const { error: updateError } = await supabaseAdmin
  .from('proposals')
  .update(updatePayload)
  .eq('id', proposalId)

if (!updateError && proposal.status === 'stale') {
  console.log(`[PDF] Successfully revived proposal from stale to sent`);
}
```

---

## Status Flow Diagram

```text
Before Fix:
  stale → [PDF regenerate] → stale (stuck!)
             ↓
        [Email resend] → sent (works)

After Fix:
  stale → [PDF regenerate] → sent ✓
        → [Email resend]   → sent ✓
```

---

## Edge Cases Considered

| Scenario | Behavior |
|----------|----------|
| Stale + PDF regenerate | → `sent` ✓ |
| Draft + PDF regenerate | No status change (stays `draft`) |
| Sent + PDF regenerate | No status change (stays `sent`) |
| Signed + PDF regenerate | No status change (already completed) |

The logic only activates for `stale` status, preserving existing behavior for all other statuses.

---

## Manual Fix for Ivan Smith

After deploying this fix, Nicole can either:
1. Click "Resend" to trigger an email (which will also update status)
2. Or you can run a quick manual SQL update:

```sql
UPDATE proposals 
SET 
  status = 'sent',
  invitation_sent_at = NOW(),
  last_email_sent_at = NOW()
WHERE id = 'eb24af09-9fc8-400f-89df-3712d990586c';
```

---

## Expected Result

After this fix:
- Regenerating a PDF for a stale proposal immediately moves it to `sent` status
- The 10-day stale timer resets
- Agents can confidently use either PDF download or email resend to revive stale proposals

