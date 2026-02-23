

# Multi-Client Proposals: Supporting Multiple Equal Co-Clients

## Summary

Enable agents to attach multiple clients (2+) to a single proposal. All clients are equal co-clients with the same visibility, and either client can sign the agreement to approve the proposal. Each client receives their own invitation link.

---

## Current Architecture (Single Client)

Today, a proposal links to one client via two columns on the `proposals` table:
- `client_id` -- the auth user ID if the client is registered
- `client_reference_id` -- the record ID in the `clients` table

The invitation system generates one token per proposal, sends one email, and expects one signature.

---

## Proposed Architecture (Multi-Client)

### New Junction Table: `proposal_clients`

Instead of modifying the existing `proposals` table columns (which would break dozens of queries, RLS policies, and edge functions), introduce a junction table that links proposals to additional clients.

```text
proposal_clients
+------------------+------+-------------------------------------------+
| Column           | Type | Notes                                     |
+------------------+------+-------------------------------------------+
| id               | uuid | PK                                        |
| proposal_id      | uuid | FK -> proposals.id                        |
| client_id        | uuid | FK -> clients.id                          |
| added_at         | ts   | Default now()                             |
| added_by         | uuid | The agent/user who added this client      |
| invitation_token | text | Unique token for this client's invitation |
| invitation_sent_at | ts | When invitation was dispatched            |
| invitation_viewed_at | ts | When client opened the link             |
| invitation_expires_at | ts | Token expiry                           |
| signed_at        | ts   | If THIS client signed                     |
+------------------+------+-------------------------------------------+
UNIQUE(proposal_id, client_id)
```

### Why a junction table?

- The existing `client_reference_id` on `proposals` stays as the **primary client** (backward compatible -- no migration of existing data needed)
- Additional clients are rows in `proposal_clients`
- The signing rule ("either can sign") is handled by checking if ANY client (primary or additional) has signed
- Scales to any number of clients without schema changes
- Each client gets their own invitation token, so tracking (sent, viewed, signed) is per-client

---

## Changes Required

### 1. Database Migration

Create the `proposal_clients` table with RLS policies:
- **SELECT**: Admins, the proposal's agent, company members of the agent, and the clients themselves
- **INSERT/DELETE**: The proposal's agent, company members, and admins (only while proposal is editable)
- **UPDATE**: Limited to system/admin for tracking invitation events

### 2. Frontend: Client Info Step

Update the client info step in the proposal creation wizard to support adding multiple clients:

- Keep the existing single-client form as the "Primary Client"
- Add an "Add Another Client" button below the primary client fields
- Each additional client has the same search/create fields (name, email, phone, company)
- Additional clients can be removed with an X button
- Store additional clients in a new `additionalClients` array in the form state

### 3. Type Updates

Update `ClientInformation` or create an `AdditionalClient` type:

```typescript
interface AdditionalClient {
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  clientId?: string; // If selected from existing clients
}
```

Update `ProposalContent` to include:
```typescript
additionalClients?: AdditionalClient[];
```

### 4. Proposal Submission Service

Update `unifiedProposalService.ts` to:
- After inserting the proposal, insert rows into `proposal_clients` for each additional client
- Look up or create client records for new additional clients (same as current primary client logic)

### 5. Invitation System

Update `send-proposal-invitation` edge function to:
- Accept an optional list of additional client emails/tokens
- Send separate invitation emails to each additional client with their own unique token
- Each client's token resolves to the same proposal

### 6. Signing Logic

Update the agreement/signing flow:
- When any client signs, the proposal moves to `signed` status (current behavior stays)
- Record which client signed in `proposal_agreements` (already has `signed_by`)
- Optionally update `proposal_clients.signed_at` for the specific client who signed

### 7. Proposal View/Details

Update proposal detail views to:
- Show all clients associated with the proposal (primary + additional)
- Show per-client invitation status (sent, viewed, signed)
- Allow agents to resend invitations to individual clients

---

## Files to Create/Modify

| Action | File | Reason |
|--------|------|--------|
| New | `supabase/migrations/...` | Create `proposal_clients` table with indexes and RLS |
| Edit | `src/types/proposals.ts` | Add `AdditionalClient` type, update `ProposalContent` |
| Edit | `src/components/proposals/types.ts` | Re-export new types |
| Edit | `src/components/proposals/ClientInfoStep.tsx` | Add multi-client UI |
| New | `src/components/proposals/client-info/AdditionalClientForm.tsx` | Reusable form for each extra client |
| Edit | `src/pages/CreateProposal.tsx` | Add `additionalClients` state |
| Edit | `src/services/proposals/unifiedProposalService.ts` | Insert `proposal_clients` rows on creation |
| Edit | `src/components/proposals/SummaryStep.tsx` | Show all clients in summary |
| Edit | `src/components/proposals/summary/ClientInformationSection.tsx` | Display additional clients |
| Edit | `supabase/functions/send-proposal-invitation/index.ts` | Support multi-client invitations |

---

## What Does NOT Change (Phase 1)

- The primary `client_reference_id` column on `proposals` remains the main client
- Existing single-client proposals continue to work unchanged
- The signing flow stays "one signature approves" -- we just allow it from any linked client
- No changes to carbon credit calculations (those are project-based, not client-based)
- No changes to onboarding -- onboarding is project-level, not client-level
- Portfolio calculations remain tied to the primary client

---

## Migration Strategy

This is purely additive:
1. New table, new component, new form fields
2. Zero changes to existing proposal data
3. Proposals with no additional clients behave exactly as today
4. The junction table is empty until agents start adding multiple clients

