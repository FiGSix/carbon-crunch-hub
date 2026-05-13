## Goal

Give admins a one-click way, from the Clients table, to:
1. **Manually confirm** a client's auth email (override the verification click), and
2. **Resend** the original client invitation email.

## What already exists (reuse, don't rebuild)

- Edge function `test-auth-verification` already implements `check_status`, `verify_user`, and `resend_confirmation` actions — admin-gated server-side. Used today only by the test panel on `/admin/EmailAutomation`.
- Edge function `send-client-invitation` already sends the branded client invite email.
- `ClientsTableContent.tsx` already has a per-row dropdown menu (Edit / Reassign / Delete) — just needs two more items.

We will **not** create new edge functions; we'll wire the existing ones into the Clients table.

## Changes

### 1. `src/components/clients/table/ClientsTableContent.tsx`
- Add admin-only menu items to the per-row dropdown:
  - **Verify email now** → calls `test-auth-verification` with `action: "verify_user"`. On success, toasts "Email confirmed for {email}" and refreshes the row.
  - **Resend invitation email** → calls `send-client-invitation` with the client's email + name + (existing) referral context. Toasts result.
- Both items are wrapped in a confirm `AlertDialog` (so admins don't fire by mistake) and disabled while their mutation is pending.
- Optional small badge in the Status column: `Verified` / `Unverified` (queried lazily via `check_status` only when the dropdown opens, to avoid bulk listUsers calls on table render).

### 2. `src/components/clients/SimpleClientsTable2.tsx` (parent)
- Pass an `isAdmin` flag (already available) and a `refetch` callback so the row can revalidate after a successful verify.

### 3. No DB migration, no new edge function, no schema change.

## Out of scope

- Bulk verify / bulk resend (can be added later if needed).
- Client-team-member pending approvals (separate flow in `ClientPendingApprovalsCard` — already has Approve/Decline buttons).
- Changing the auth email-hook or template logic.

## Acceptance

- As admin on `/clients` (or wherever `SimpleClientsTable2` renders), opening a client row's `⋮` menu shows **Verify email now** and **Resend invitation email**.
- Clicking **Verify email now** → confirm dialog → success toast; the user can immediately log in without clicking the email link.
- Clicking **Resend invitation email** → success toast; new email arrives at the client's inbox.
- Non-admins see no change.
