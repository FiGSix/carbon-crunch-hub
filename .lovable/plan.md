

# Fix: Proposal Not Re-rendering with Correct Client After "Make Primary"

## Root Cause

There are two bugs working together:

### Bug 1: `client_reference_id` update may fail silently

In `useProposalEdit.ts`, the save function performs **two separate database updates**:
1. Line 353: Updates `content` JSON (with correct new clientInfo) — succeeds
2. Line 409: Updates `client_reference_id` in a **separate** call — may fail, but only logs a `console.warn`

The user sees "Proposal updated successfully" even if the second update fails. The `client_reference_id` stays pointing to the old client (ops@keystone).

### Bug 2: View prioritizes stale `client_reference_id` join over correct snapshot

`ProposalDetails.tsx` calls `resolveClientInfo(proposal.content?.clientInfo, proposal.client)` where `proposal.client` comes from a Supabase JOIN on `client_reference_id`. Since the live join data takes **precedence** over the snapshot, even though `content.clientInfo` has the correct gm@keystone data, the view shows ops@keystone from the stale join.

### Bug 3: Invitation email uses `client_reference_id` for email resolution

`useProposalInvitations.ts` line 177 fetches the client email from the `clients` table via `client_reference_id`. If that FK wasn't updated, the email goes to the old client.

### Why `client_reference_id` fails to update

The most likely cause: the first `UPDATE` at line 353 and the second `UPDATE` at line 409 are **not combined into a single operation**. They should be. Additionally, if `resolvedPrimaryClientId` is `null` because the find-or-create block failed (e.g., RLS blocked the insert into `clients`), line 408's condition `primaryChanged && resolvedPrimaryClientId` evaluates to **false** and the update is silently skipped.

## Fix

### `src/hooks/proposals/view/useProposalEdit.ts`

**Combine both updates into a single database call.** Move the `client_reference_id` resolution BEFORE the main proposal update, then include it in the same `.update()` call.

Current flow:
```text
1. Update proposals SET content=..., system_size_kwp=... WHERE id=...
2. (separately) Resolve/create primary client
3. (separately) Update proposals SET client_reference_id=... WHERE id=...
```

Fixed flow:
```text
1. Resolve/create primary client (if changed)
2. Update proposals SET content=..., system_size_kwp=..., client_reference_id=... WHERE id=...
   (single atomic update with all fields including client_reference_id)
```

Also: if `client_reference_id` resolution fails, **abort the save** with an error toast instead of silently continuing.

### Changes

| File | Change |
|------|--------|
| `src/hooks/proposals/view/useProposalEdit.ts` | Move client resolution before the proposal update; combine `client_reference_id` into the single `.update()` call; fail loudly if resolution fails |

