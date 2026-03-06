

# Analysis: CRM Access + Email Resolution Bugs

## 1. How to Access the CRM

The CRM (client management) is the **My Clients** page. Navigate to it via the sidebar menu — it's labeled "My Clients" and routes to `/my-clients`. It loads `MyClients2.tsx`.

## 2. Root Cause: Two Contradictory Data Resolution Patterns

There are **two bugs** causing the email mismatch, both stemming from inconsistent precedence rules across the codebase.

### Bug A: `resolveClientInfo` has WRONG precedence (UI display)

In `src/utils/proposals/resolveClientInfo.ts` (line 40-46), the comment says "Live client data takes precedence" but the code does the **opposite** — snapshot takes precedence:

```typescript
// Comment says: "Live client data takes precedence"
// Code does: snapshot wins
name: snapshotClientInfo.name || liveName || '',    // snapshot first!
email: snapshotClientInfo.email || clientRecord.email || '',  // snapshot first!
```

This means the UI displays the **old snapshot email** (`gm@...`) even after "Make Primary" swaps the `client_reference_id` to a different client whose live record has `ops@...`.

### Bug B: `useProposalInvitations` overrides snapshot with live (email sending)

In `useProposalInvitations.ts` (lines 173-192), the invitation system **always** overwrites the snapshot email with the live `clients` table email:

```typescript
let resolvedEmail = clientInfo?.email;  // starts with snapshot
if (clientReferenceId) {
  // ... fetches live client and OVERRIDES resolvedEmail
  resolvedEmail = liveClient.email;  // live wins
}
```

### The Result

- **UI shows**: `gm@keystonehatchery.co.za` (from snapshot, which wasn't updated when primary was swapped)
- **Email sends to**: `ops@keystonehatchery.co.za` (from live `clients` table via `client_reference_id`)
- **User sees a contradiction**: the proposal says one email, but sends to another

### Bug C: `makePrimary` doesn't update the snapshot email correctly

When "Make Primary" is clicked in `useProposalEdit.ts` (line 249-276), it swaps the form fields. But the swapped data comes from `additionalClients[index]` which stores whatever was in the form — it does NOT re-fetch the live client record. If the additional client's email was loaded from a stale snapshot, the swap propagates stale data.

More critically, after save (line 420-438), the code syncs the **new primary's form data back to the `clients` table**. So if the form had `gm@...` for the new primary, it would **overwrite** the live client record that actually has `ops@...`, corrupting the CRM data.

## Fix Plan

### Fix 1: Align `resolveClientInfo` — live data takes precedence (match the comment)

Change `src/utils/proposals/resolveClientInfo.ts` so live client data wins over snapshot, matching the documented intent:

```typescript
return {
  name: liveName || snapshotClientInfo.name || '',
  email: clientRecord.email || snapshotClientInfo.email || '',
  phone: clientRecord.phone || snapshotClientInfo.phone || '',
  companyName: clientRecord.company_name || snapshotClientInfo.companyName || '',
  registrationNumber: clientRecord.registration_number || snapshotClientInfo.registrationNumber,
  // ... preserve extra snapshot fields
};
```

This aligns UI display with what the invitation system actually sends.

### Fix 2: Update `makePrimary` to use `clientId` for live data resolution on save

When the primary is swapped via "Make Primary", the `save()` function already resolves `client_reference_id` and syncs the client record. The issue is that the sync at line 420-438 updates the **new** primary client record with form data that may be stale. 

The fix: after `makePrimary` swaps fields, the `save()` should only sync fields that the user explicitly edited, not blindly overwrite the entire client record. However, this is a larger refactor. The simpler immediate fix is:

- When `makePrimary` swaps, if the target has a `clientId`, fetch the live record and populate the form with live data instead of the stale `additionalClients` snapshot.

### Fix 3: Ensure invitation hook and UI use the same resolution logic

After Fix 1, both the UI (`resolveClientInfo`) and the invitation hook will agree: live data wins. The UI will show the correct email that will actually be sent.

## Impact

- Fixes the mismatch where UI shows one email but sends to another
- Prevents `makePrimary` from corrupting live CRM records with stale snapshot data
- Aligns the documented behavior ("live takes precedence") with actual code

## Files to Change

| File | Change |
|------|--------|
| `src/utils/proposals/resolveClientInfo.ts` | Flip precedence: live data wins over snapshot |
| `src/hooks/proposals/view/useProposalEdit.ts` | `makePrimary`: fetch live client data when target has `clientId` |

