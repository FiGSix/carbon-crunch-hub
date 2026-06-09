## Root cause

`src/services/proposals/unifiedProposalService.ts` (line 155) auto-approves any new proposal for a client whose `clients.cession_signed_at` is set:

```ts
const hasExistingAgreement = !!clientRecord?.cession_signed_at;
// ...
status: hasExistingAgreement ? 'approved' : 'draft',
signed_at: hasExistingAgreement ? new Date().toISOString() : null,
```

Juan Mallinson's client row (`b8122310-…`) still has `cession_signed_at = 2026-06-09 08:18:30` and `first_agreement_id = bb2b3119-…` from his earlier signed proposal "Rhino Energy (Pty) Ltd - TEST". When that original proposal was deleted, the `delete_proposal` RPC removed/soft-deleted the proposal but never cleared these fields on `clients`. So every new proposal for Juan is created already-signed.

Same pattern affects any client whose original agreement-bearing proposal is later deleted.

## Plan

1. **DB migration — clear cession on delete**
   Update the `delete_proposal` SQL function so that, when the proposal being deleted is the one referenced by `clients.first_agreement_id`, it also sets `clients.first_agreement_id = NULL` and `clients.cession_signed_at = NULL` for that client (and any additional clients linked via `proposal_clients`).

2. **DB migration — backfill orphaned cessions**
   One-time UPDATE: for every `clients` row whose `first_agreement_id` points to a proposal that no longer exists (or is soft-deleted), null out `first_agreement_id` and `cession_signed_at`. This fixes Juan and any other affected client.

3. **Harden the creation check** (`unifiedProposalService.ts` ~line 145-162)
   Replace the simple `cession_signed_at` check with a query that also confirms the referenced `first_agreement_id` proposal still exists and is not soft-deleted before treating the client as "returning". Defence-in-depth so a future delete path that forgets to clean up cannot resurrect this bug.

4. **Verification**
   - Re-query Juan's client row → both fields should be null.
   - Create a new test proposal for Juan → should be `status='draft'`, `signed_at=null`.
   - Create a new proposal for a client who genuinely has a valid prior signed agreement → should still auto-approve (regression check).

No UI changes. No changes to the auto-approval business rule itself — only to when it applies.
