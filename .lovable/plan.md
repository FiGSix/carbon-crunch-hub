

# Add "Edit Proposal" to the View Page

## What This Adds

An **Edit button** on the proposal view page that allows agents (for their own proposals) and admins (for any proposal) to update proposal details after creation. This avoids the current workaround of deleting and recreating proposals when something needs correcting.

---

## What Can Be Edited

The editable fields mirror what was entered during creation:

**Client Information**
- Client name, email, phone, company name

**Project Information**
- Project name, address, system size (kWp), commission date, additional notes
- Multi-phase details (if applicable)

**What Cannot Be Edited** (intentionally locked)
- Eligibility criteria (these are pass/fail at creation)
- Status (managed by approve/reject workflow)
- Client share percentage and agent commission (set by business rules / admin override)
- Signed agreement data

---

## Who Can Edit

- **Agents**: Can edit their own proposals
- **Admins**: Can edit any proposal
- **Clients**: Cannot edit (they can only approve/reject)

## When Editing Is Allowed

- Proposals with status `draft`, `sent`, or `pending` can be edited freely
- `approved` (signed) proposals cannot be edited -- a banner will explain why
- Archived or deleted proposals cannot be edited

---

## How It Works (User Experience)

1. Agent or admin opens a proposal from the view page
2. An **"Edit"** button (pencil icon) appears in the header next to the existing PDF/Invite buttons
3. Clicking it opens an **edit dialog/modal** with the current client and project info pre-filled in editable form fields
4. The user modifies what they need and clicks **"Save Changes"**
5. The proposal record is updated in the database, including recalculating `annual_energy`, `carbon_credits`, and `system_size_kwp` if the system size changed
6. The view page refreshes to show the updated data

---

## Technical Approach

### New Files

| File | Purpose |
|---|---|
| `src/components/proposals/view/ProposalEditDialog.tsx` | Modal dialog with editable form fields for client info and project info |
| `src/hooks/proposals/view/useProposalEdit.ts` | Hook managing form state, validation, and the Supabase update call |

### Modified Files

| File | Change |
|---|---|
| `src/components/proposals/view/ProposalHeader.tsx` | Add an "Edit" button next to existing action buttons, visible to agents/admins on editable-status proposals |
| `src/components/proposals/view/ProposalContent.tsx` | Pass `fetchProposal` callback down so the edit dialog can refresh data after save |

### Database

No schema changes needed. The existing `proposals_update_policy` RLS policy already permits agents to update their own proposals and admins to update any proposal:

```text
proposals_update_policy: auth.uid() = agent_id OR is_admin()
```

### Update Logic (in `useProposalEdit`)

When saving, the hook will:

1. Update `proposals.content` JSON (clientInfo and projectInfo sections)
2. Update `proposals.title` to match the project name
3. Update `proposals.project_info` JSON column
4. If system size changed: recalculate and update `system_size_kwp`, `annual_energy`, and `carbon_credits` using the existing `calculateAnnualEnergy` and `calculateCarbonCredits` functions from `@/services/calculations/carbon/calculations`
5. Set `updated_at` to now

### Edit Dialog Structure

The dialog will have two sections matching the creation wizard:

- **Client Info Section**: Name, email, phone, company (text inputs)
- **Project Info Section**: Name, address, system size, commission date, notes (text/date inputs)

Basic validation (required fields, email format, positive system size) will run before save.

---

## Guardrails

- The edit button is hidden for clients (role check)
- The edit button is hidden on signed/approved proposals (status check)
- The edit button is hidden on archived or deleted proposals
- System size changes trigger automatic recalculation of derived fields
- An agent can only edit proposals where they are the `agent_id` (enforced by RLS)

