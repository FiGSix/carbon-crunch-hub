

# Update Primary Client on a Proposal

## Problem

The current edit dialog allows changing the primary client's name/email/phone but always keeps `proposals.client_reference_id` pointing to the same `clients` record. If you want a different person to be the primary recipient (the one who gets the invitation email), there is no mechanism to swap them.

The invitation system (`useProposalInvitations.ts` line 177) resolves email from `client_reference_id` — so changing the primary client means updating that foreign key on the `proposals` table.

## Solution

Add a "Make Primary" action to each additional client in the edit dialog. When clicked, it swaps that additional client into the primary slot and moves the current primary into the additional clients list. On save, the `client_reference_id` on the `proposals` table is updated to point to the new primary client's record.

## Changes

### 1. `src/hooks/proposals/view/useProposalEdit.ts`

- Add `primaryClientId: string | null` to `ProposalEditFormData`, populated from `proposal.client_reference_id`
- Add a `makePrimary(index: number)` function that:
  - Moves the current primary client fields (name, email, phone, company) into `additionalClients` (with current `primaryClientId` as `clientId`)
  - Copies the selected additional client's fields into the primary slot
  - Sets `primaryClientId` to that additional client's `clientId` (or null if new)
- In `save()`:
  - If `primaryClientId` changed, resolve or create the new client record in the `clients` table
  - Update `proposals.client_reference_id` to the new primary client's ID
  - The existing client update logic (line 341) already uses `proposal.client_reference_id` — change it to use `formData.primaryClientId` so it updates the correct record

### 2. `src/components/proposals/view/ProposalEditDialog.tsx`

- Add a "Make Primary" button (small, outline) next to each additional client's remove button
- Wire it to the `makePrimary` handler from the hook
- Show a visual indicator on the primary client section (e.g., a badge or label saying "Primary - receives invitation email")

### 3. `src/components/proposals/client-info/AdditionalClientForm.tsx`

- Add an optional `onMakePrimary` prop
- When provided, render a "Make Primary" button in the client card header

## File Summary

| File | Change |
|------|--------|
| `src/hooks/proposals/view/useProposalEdit.ts` | Add `primaryClientId` state, `makePrimary()` swap logic, update `save()` to sync `client_reference_id` |
| `src/components/proposals/view/ProposalEditDialog.tsx` | Wire up "Make Primary" button, add primary label |
| `src/components/proposals/client-info/AdditionalClientForm.tsx` | Add optional `onMakePrimary` prop and button |

