# Fix: Super partners see no action buttons on proposal view

## Root cause

Every action button in the proposal view header is gated to `agent` or `admin` only. Brian (`brian@vitalista.co.za`) is a `super_partner`, so the toolbar renders empty.

Specifically in `src/components/proposals/view/ProposalHeader.tsx`:

- Line 51-52 — Archive / Reactivate gate (`canManageArchive`)
- Line 62-63 — Edit gate (`canEdit`)
- Line 146 — Download PDF button
- Line 174 — Send / Invite button

Same omission in:

- `src/components/proposals/view/ProposalContent.tsx` line 77 — Delete dialog
- `src/components/proposals/view/ProposalDetails.tsx` line 96 — Email Activity & Automation panel

The cession-agreement button (line 154) is correctly admin-only and stays unchanged.

## Decision (from your answer)

Super partners act exactly like agents for proposals **they themselves created** (`proposal.agent_id === user.id`). They do **not** get any visibility into proposals their downstream partners added — that is unchanged.

This is a one-rule change: treat `super_partner` the same as `agent` in every action gate. The existing `agent_id === user?.id` ownership check already scopes the action to the super partner's own proposals — no new query, no RLS change, no schema change.

## Changes

### 1. `src/components/proposals/view/ProposalHeader.tsx`

Replace the four role checks so `super_partner` is treated like `agent`:

- `canManageArchive` (L48-52): allow `admin`, or (`agent`/`super_partner` where `proposal.agent_id === user?.id`)
- `canEdit` (L56-64): same expansion
- Download PDF gate (L146): `userRole === "agent" || userRole === "admin" || userRole === "super_partner"`
- Invite/Send button gate (L174): same expansion

Admin-only gates (cession agreement, L154) are left alone.

### 2. `src/components/proposals/view/ProposalContent.tsx`

Line 77 — include `super_partner` in the Delete dialog gate so they can delete their own proposals (deletion is already further protected server-side / by ownership in the existing handler).

### 3. `src/components/proposals/view/ProposalDetails.tsx`

Line 96 — Email Activity & Automation panel is currently `agent`-only. Extend to `super_partner` so they have the same operational visibility on their own proposals.

## Out of scope

- Agent and admin behaviour — unchanged.
- Super partner access to **downstream partners'** proposals — explicitly not added, per your instruction.
- RLS policies on `proposals` — unchanged. Visibility of the proposal record itself already works (Brian can open the view), so the database side needs no migration.
- The "Logged in as ... (Agent)" label at L103 — left as agent-only to avoid changing copy semantics; tell me if you'd like it shown for super partners too.

## How to verify

1. Sign in as Brian, open a proposal he created — toolbar now shows Download PDF, Edit, Send/Invite, and Archive (where applicable).
2. Sign in as Brian, open a proposal owned by a different agent — Edit/Archive remain hidden (ownership check still applies); Download PDF and Send show, matching agent behaviour today.
3. Sign in as a regular agent and admin — no change in what they see.
