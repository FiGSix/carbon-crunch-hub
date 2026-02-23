

# Fix: Proposal Edit Not Updating Client Information

## Root Cause

The proposal detail page uses `resolveClientInfo()` to display client data. This function merges two data sources:

1. **Snapshot** -- `proposal.content.clientInfo` (stored in the proposal's JSON)
2. **Live record** -- the linked row in the `clients` table (via `client_reference_id`)

Live data takes precedence over the snapshot. When you edit a proposal:
- The edit hook (`useProposalEdit.ts`) updates the **snapshot only** (the `content` JSON column)
- It does **not** update the linked `clients` table record
- On the next page load, `resolveClientInfo()` overwrites your edit with the old live data from the `clients` table

**This affects all client fields**: name, email, phone, and company name. Project fields (system size, address, etc.) are unaffected because they don't go through this merge logic.

## Solution

Update `useProposalEdit.ts` to also update the linked `clients` table record when client information changes.

## Changes

### File: `src/hooks/proposals/view/useProposalEdit.ts`

In the `save()` function, after the successful `proposals` table update, add a second update to the `clients` table:

- Split `formData.clientName` into `first_name` and `last_name` (last word = last name, everything before = first name)
- Update the `clients` record matching `proposal.client_reference_id` with: `first_name`, `last_name`, `email`, `phone`, `company_name`
- Only perform this update if `proposal.client_reference_id` exists (some proposals may not have a linked client record)
- If the client update fails, log a warning but don't block the overall save (the snapshot is already saved as a fallback)

### Technical Detail

```
save() {
  // ... existing proposal update (lines 127-138) ...

  // NEW: Also update the clients table so resolveClientInfo() picks up the change
  if (proposal.client_reference_id) {
    const nameParts = formData.clientName.trim().split(/\s+/);
    const lastName = nameParts.length > 1 ? nameParts.pop() : '';
    const firstName = nameParts.join(' ');

    await supabase
      .from('clients')
      .update({
        first_name: firstName,
        last_name: lastName,
        email: formData.clientEmail.trim(),
        phone: formData.clientPhone.trim(),
        company_name: formData.clientCompanyName.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', proposal.client_reference_id);
  }
}
```

## Files Summary

| Action | File | Reason |
|--------|------|--------|
| Edit | `src/hooks/proposals/view/useProposalEdit.ts` | Add clients table update alongside the content snapshot update |

## What Does NOT Change

- No changes to `resolveClientInfo()` -- the merge logic is correct by design
- No changes to `ProposalEditDialog.tsx` -- the form fields stay the same
- No database migrations needed -- existing RLS on `clients` already allows agents to update clients linked to their proposals
- No changes to project field editing -- those already work correctly

