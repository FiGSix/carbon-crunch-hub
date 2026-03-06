

# Plan: Sync Client Data Consistently Across All Views

## Problem Summary

When client details are edited via the proposal edit dialog, three data stores exist but are not kept in sync:

| Data Store | Updated by Proposal Edit? | Used By |
|---|---|---|
| **Proposal snapshot** (`content.clientInfo` JSON) | Yes | Proposal view UI |
| **`clients` table** (CRM record) | Yes (lines 453-465) | My Clients page, invitation emails |
| **`profiles` table** (auth user profile) | Partially — only if `clients.user_id` exists (lines 471-484) | User Management page |

### Why "My Clients" might show stale data

The proposal edit **does** sync to the `clients` table (lines 453-465). If "My Clients" still shows old data, there are two possible causes:

1. **The `client_reference_id` points to the wrong client record** (the desync identified in the previous plan). The edit syncs to whichever record `client_reference_id` points to — if that's the wrong record, the intended client never gets updated.
2. **RLS blocks the update silently**. The `clients` table UPDATE policy requires `is_current_user_agent() AND (created_by = auth.uid() OR agent_has_proposals_with_client(id))`. If neither condition is met, the update fails silently (the code only `console.warn`s on error).

### Why "User Management" shows different data from "My Clients"

User Management reads from `profiles` table. My Clients reads from `clients` table. These are **two separate tables** with no automatic sync mechanism:

- `profiles` stores auth-user data (name, email, phone, company)
- `clients` stores CRM records (name, email, phone, company)
- A client record *may* link to a profile via `clients.user_id`

The proposal edit attempts to sync profiles (lines 471-484), but:
- **Email is intentionally excluded** from the profile sync (auth identity concern)
- If the `clients.user_id` is null (client hasn't signed up), no profile sync happens at all
- The sync only runs on proposal save — direct CRM edits in "My Clients" don't sync back to profiles

## Root Causes

1. **Wrong `client_reference_id`** — the previously identified desync means edits update the wrong client record
2. **No bidirectional sync** — editing a client directly in "My Clients" doesn't update `profiles`, and editing a profile doesn't update `clients`
3. **Silent failures** — RLS-blocked updates are swallowed with `console.warn`

## Fix Plan

### Fix 1: Apply the previously approved `extractFormData` fix
Ensure `client_reference_id` matches the displayed primary client so edits target the correct CRM record. (Already planned in previous conversation.)

### Fix 2: Make the client→profile sync more robust in `useProposalEdit.ts`

**File: `src/hooks/proposals/view/useProposalEdit.ts`** (lines 445-488)

- Surface sync failures as user-visible warnings (toast.warning) instead of silent `console.warn`
- Log which client record ID was updated for debuggability

### Fix 3: Add client→profile sync to the My Clients edit flow

Identify the "My Clients" edit handler (likely in `SimpleClientsTable2` or a related hook) and add the same profile sync logic: when a `clients` record with a non-null `user_id` is updated, also update the corresponding `profiles` row (first_name, last_name, phone, company_name — excluding email).

### Fix 4: Ensure User Management shows consistent data

User Management (`UserManagementTable.tsx`) reads from `profiles` for registered users and from `clients` for "Potential Clients" (unlinked records). For registered clients who also have a `clients` record, the data shown comes from `profiles` only. After Fix 3, profiles will stay in sync with client records, so the data will be consistent.

## Files to Change

| File | Change |
|---|---|
| `src/hooks/proposals/view/useProposalEdit.ts` | (1) Apply `extractFormData` live-data fix from previous plan. (2) Surface sync failures as visible warnings. |
| My Clients edit handler (needs identification) | Add profile sync when updating a client record that has `user_id` |

## Scope Note

This plan addresses why the data is inconsistent. The `extractFormData` fix from the previous plan (ensuring form loads live client data) is a prerequisite — without it, edits will continue targeting the wrong record.

