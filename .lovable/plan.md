

# Plan: Fix New Client Save Failure + Confirm Email Flow

## The Current Problem

When Connor adds a brand-new client (not in the system) and makes them primary, the save fails because the INSERT at lines 413-424 of `useProposalEdit.ts` **silently ignores errors**:

```typescript
const { data: newClient } = await supabase  // ← error is not captured
  .from('clients')
  .insert({ ... })
  .select('id')
  .single();
if (newClient) resolvedPrimaryClientId = newClient.id;  // null if insert failed
```

If the insert fails for any reason (RLS, constraint, network), `newClient` is `null`, `resolvedPrimaryClientId` stays `null`, and the user sees "Failed to resolve the new primary client" with no explanation.

## What Needs to Change

### Fix: Capture and surface INSERT errors

**File: `src/hooks/proposals/view/useProposalEdit.ts`** (lines 413-425)

Replace the current INSERT block to capture the error and show it:

```typescript
const { data: newClient, error: insertError } = await supabase
  .from('clients')
  .insert({
    first_name: fn,
    last_name: ln,
    email: formData.clientEmail.trim(),
    phone: formData.clientPhone.trim() || null,
    company_name: formData.clientCompanyName.trim() || null,
    created_by: user.id,
  })
  .select('id')
  .single();

if (insertError) {
  console.error('Failed to create client record:', insertError);
  if (insertError.message.includes('unique') || insertError.message.includes('duplicate')) {
    toast.error('A client with this email already exists but could not be linked. Please search for them instead of typing manually.');
  } else {
    toast.error(`Could not create client: ${insertError.message}`);
  }
  return false;
}
if (newClient) resolvedPrimaryClientId = newClient.id;
```

## Answering Your Question: Email Flow for New Clients

Once the above fix is in place, the flow for a brand-new client works correctly:

1. **Save** — creates a new `clients` record, sets `client_reference_id` on the proposal
2. **Send Invitation** — `useProposalInvitations.ts` fetches live data from `clients` table via `client_reference_id`, resolves the email and name, sends the branded invitation email
3. **Client receives email** — clicks link, lands on the proposal view page
4. **Client registers** — creates a Supabase auth account; the registration flow links `clients.user_id` to the new auth user and updates `proposals.client_id`
5. **Client signs** — recorded in `proposal_agreements` table

So yes: the system will add the client to the proposal, send them the email, and the client record gets linked to their auth account once they sign up. The only issue is the missing error handling on the INSERT that prevents the save from completing.

## Files to Change

| File | Change |
|------|--------|
| `src/hooks/proposals/view/useProposalEdit.ts` | Add error capture to client INSERT (lines 413-425), surface specific error messages via toast |

