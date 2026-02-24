

# Fix: Enable Dawn Harris-Slabber to Sign + Sync Profile on Edit

## What's Happening

Dawn (`sl@bber.africa`) logs in but can't see the Accept/Reject buttons on "The Gallops Drive" proposal. Two issues need fixing:

1. **Identity mismatch blocks signing**: The proposal only has `client_reference_id` (a `clients` table ID), not `client_id` (the auth user ID). The code compares these directly — they never match.
2. **Profile name not synced on edit**: When you edit a proposal's client name, it updates the `clients` table but NOT the `profiles` table, so the auth account still shows "Shaun Slabber" instead of "Dawn Harris-Slabber."

## Changes

### 1. Fetch the client's `user_id` when loading proposals

**File: `src/hooks/proposals/view/utils/proposalFetchers.ts`**

In `fetchProposalById`, add `user_id` to the `client:client_reference_id` join select:

```
client:client_reference_id (
  first_name,
  last_name,
  email,
  phone,
  company_name,
  registration_number,
  user_id          // <-- ADD THIS
)
```

### 2. Pass `user_id` through the transformer

**File: `src/utils/proposals/simplifiedTransformers.ts`**

In `transformToProposalData`, add:

```
client_reference_user_id: rawProposal.client?.user_id || null,
```

This resolves the `clients.user_id` and exposes it directly on the proposal object.

### 3. Add the field to the type

**File: `src/types/proposals.ts`**

Add to `ProposalData`:

```
client_reference_user_id?: string | null;
```

### 4. Use the resolved user ID in status checks

**File: `src/hooks/proposals/view/useProposalStatus.ts`**

Update the `isDirectClient` check to also compare against the resolved user ID:

```typescript
const isDirectClient = userRole === 'client' && (
  proposal.client_id === user?.id || 
  proposal.client_reference_id === user?.id ||
  proposal.client_reference_user_id === user?.id  // NEW
);
```

### 5. Sync profile table when editing proposals

**File: `src/hooks/proposals/view/useProposalEdit.ts`**

After the existing `clients` table update (around line 248), add a block that also updates the `profiles` table:

```typescript
// Also sync to profiles table if the client has a linked user account
if (proposal.client_reference_id) {
  const { data: clientData } = await supabase
    .from('clients')
    .select('user_id')
    .eq('id', proposal.client_reference_id)
    .single();

  if (clientData?.user_id) {
    await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone: formData.clientPhone.trim(),
        company_name: formData.clientCompanyName.trim(),
      })
      .eq('id', clientData.user_id);
  }
}
```

Email is intentionally NOT synced to profiles because it's tied to auth and requires a separate flow.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/proposals/view/utils/proposalFetchers.ts` | Add `user_id` to the client join select |
| `src/utils/proposals/simplifiedTransformers.ts` | Map `client.user_id` to `client_reference_user_id` |
| `src/types/proposals.ts` | Add `client_reference_user_id` to `ProposalData` |
| `src/hooks/proposals/view/useProposalStatus.ts` | Check `client_reference_user_id` in identity match |
| `src/hooks/proposals/view/useProposalEdit.ts` | Sync name changes to `profiles` table via `clients.user_id` |

## Result

- Dawn will immediately be able to sign "The Gallops Drive" (identity resolution fix)
- Future edits to client names will also update the auth profile, keeping names consistent
- Fixes the same issue for ~867 other proposals that only have `client_reference_id`
- No database migration needed

