

# Fix: Proposal Acceptance Page Uses Stale Client Name

## Problem

The proposal acceptance page (`src/pages/ProposalAcceptance/index.tsx`) reads the client name from a frozen JSON snapshot (`proposal.content.clientInfo.name`). This snapshot is set when the proposal is first created and may not reflect edits made later via the Edit Proposal dialog.

The rest of the app uses `resolveClientInfo()` which merges live data from the `clients` table with the snapshot, giving precedence to live data. The acceptance page skips this entirely.

This means:
- If an admin updates the client name via the edit button, the acceptance page still shows the old name
- The typed-name validation compares against the stale snapshot name, so the client cannot sign
- This will affect every proposal where client info was edited after creation

## Current Data State

| Source | Name |
|--------|------|
| `proposal.content.clientInfo.name` (snapshot) | Dawn Harris-Slabber |
| `clients` table (live record) | Dawn Harris-Slabber |

Both still say "Dawn Harris-Slabber". If the intended signer is Shaun Slabber, the client record name needs to be updated too. But the code fix is needed regardless to prevent this pattern from recurring.

## Fix

### 1. Fetch live client data in the acceptance page

After fetching the proposal, also fetch the linked client record from the `clients` table using `client_reference_id`, then use `resolveClientInfo()` to get the merged (live-priority) client name.

**File:** `src/pages/ProposalAcceptance/index.tsx`

- Add a `clientRecord` state variable
- After setting the proposal, fetch the client record: `SELECT first_name, last_name, email, phone, company_name FROM clients WHERE id = client_reference_id`
- Update `getClientName()` to use `resolveClientInfo(proposal.content.clientInfo, clientRecord)` instead of reading the snapshot directly

### 2. Update `getClientName()` to use resolved info

```text
Before:
  const getClientName = () => proposal.content?.clientInfo?.name || "";

After:
  const resolvedClient = resolveClientInfo(
    proposal.content?.clientInfo || {},
    clientRecord
  );
  const getClientName = () => resolvedClient.name || "";
```

This ensures the typed-name validation and the displayed "client name" label always reflect the latest data from the `clients` table.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/ProposalAcceptance/index.tsx` | Fetch live client record, use `resolveClientInfo()` for name resolution |

## Impact

- Fixes the signing issue for any proposal where client info was edited after creation
- Consistent with how the rest of the app resolves client info
- No database migration needed
- The `resolveClientInfo` utility already exists and is well-tested

