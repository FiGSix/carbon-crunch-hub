

# Add Client to Existing Proposal

You're right — the multi-client infrastructure already exists. The creation wizard supports adding additional clients, the `proposal_clients` junction table is in place, and the summary/view components can display them. The gap is simply that the **edit dialog** doesn't let you add/remove additional clients on an existing proposal.

## What to Build

Add an "Additional Clients" section to the existing `ProposalEditDialog`, reusing the `AdditionalClientForm` component that already works in the creation wizard. On save, sync the `proposal_clients` junction table and `content.additionalClients` JSON.

## Changes

### 1. `src/hooks/proposals/view/useProposalEdit.ts`

- Add `additionalClients: AdditionalClient[]` to `ProposalEditFormData`
- In `extractFormData`, populate from `proposal.content.additionalClients || []`
- Add `addClient`, `updateAdditionalClient`, `removeAdditionalClient` methods
- Validate additional clients (name + email required)
- In `save()`:
  - Write `additionalClients` into `content.additionalClients`
  - Delete existing `proposal_clients` rows for this proposal (except primary)
  - Insert new rows into `proposal_clients` for each additional client, creating client records if needed via the existing `searchClients` / client creation logic

### 2. `src/components/proposals/view/ProposalEditDialog.tsx`

- Import `AdditionalClientForm` and `UserPlus` icon
- After the Client Information section, render the list of additional clients using `AdditionalClientForm`
- Add an "Add Another Client" button (same pattern as `ClientInfoStep`)
- Wire up the add/update/remove handlers from the hook

### 3. `src/hooks/proposals/view/useProposalEdit.ts` — Junction table sync in `save()`

```text
save() flow for additional clients:
1. For each additional client:
   - If clientId exists → use it
   - Else → search by email in clients table
   - If not found → create new client record
2. Delete all proposal_clients rows WHERE proposal_id = X
3. Insert fresh rows for each additional client (+ primary)
4. Update content.additionalClients in the proposal JSON
```

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/proposals/view/useProposalEdit.ts` | Add additional client state, validation, and junction table sync |
| `src/components/proposals/view/ProposalEditDialog.tsx` | Add additional clients UI section using existing `AdditionalClientForm` |

No database migration needed — `proposal_clients` table already exists with the right schema.

