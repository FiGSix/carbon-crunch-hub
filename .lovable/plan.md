

# Fix: Multi-Phase Proposal Editing and Resend Button Visibility

## Problems Found

### 1. Edit form breaks on multi-phase proposals
The Keystone Hatchery proposal has 2 phases but `content.projectInfo.size` is empty (the total is in `totalSystemSize` and `system_size_kwp`). The edit form reads `projectInfo.size`, gets `""`, and validation blocks saving with "System size is required."

### 2. No per-phase editing capability
The edit dialog only shows a single "System Size" and "Commission Date" field. For multi-phase proposals, there is no way to edit individual phase sizes or commission dates. Agents need to update each phase independently.

### 3. Resend button hidden for "delivered + viewed" proposals
The `ProposalInviteButton` has a gap in its status conditions:
- Line 132 checks `"delivered"` but requires `!invitation_viewed_at` -- this proposal has been viewed, so it fails
- Line 155 checks `"sent" || "viewed"` -- status is `"delivered"`, so it fails too

Result: No resend/send-again button appears for proposals in "delivered" status that have been viewed.

## Current Proposal State (Keystone Hatchery)

| Field | Value |
|-------|-------|
| Status | delivered |
| Agent | Connor Gibbs (matches agent_id) |
| signed_at | null |
| archived_at | null |
| projectInfo.size | "" (empty) |
| totalSystemSize | 725.62 |
| system_size_kwp | 725.62 |
| Phases | Phase 1: 325.61 kWp (2023-04-09), Phase 2: 400.01 kWp (2024-04-23) |
| invitation_viewed_at | Set (2026-02-24) |

The Edit button DOES show for Connor (he is the agent, status is not finalized). But when he opens the dialog, the system size field is blank and he cannot save.

## Fix Plan

### Fix 1: Multi-phase aware edit form (`useProposalEdit.ts`)

**extractFormData**: Add fallbacks for system size:
```
systemSize: projectInfo.size
  || (projectInfo.totalSystemSize ? String(projectInfo.totalSystemSize) : '')
  || (proposal.system_size_kwp ? String(proposal.system_size_kwp) : ''),
```

Add `phases` to the form data so they can be edited independently. Each phase has `sizeKWp`, `commissionDate`, and `phaseName`.

**validate**: For multi-phase proposals, validate each phase's size individually instead of the single systemSize field. The total system size becomes read-only (auto-calculated from phases).

**save**: When saving multi-phase proposals, update each phase in `content.projectInfo.phases`, recalculate `totalSystemSize`, and sync to `system_size_kwp`.

### Fix 2: Phase editing UI (`ProposalEditDialog.tsx`)

Detect if the proposal is multi-phase (has `content.projectInfo.phases` with length > 1). If so:
- Hide the single "System Size" and "Commission Date" fields
- Show a "Project Phases" section with per-phase editing (size + commission date for each phase)
- Display an auto-calculated total system size (read-only)

Reuse the existing `ProjectPhasesInput` component pattern for the edit dialog, or render a simpler inline version.

### Fix 3: Resend button for "delivered + viewed" (`ProposalInviteButton.tsx`)

Add `"delivered"` to the status check on line 155 so that proposals in "delivered" status with `invitation_viewed_at` set show the "Send Again" button:

```
Before:
  (proposal.status === "sent" || proposal.status === "viewed") && proposal.invitation_viewed_at

After:
  (proposal.status === "sent" || proposal.status === "delivered" || proposal.status === "viewed") && proposal.invitation_viewed_at
```

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/proposals/view/useProposalEdit.ts` | Add phases to form data, fallback system size extraction, per-phase validation, per-phase save logic |
| `src/components/proposals/view/ProposalEditDialog.tsx` | Add conditional phase editing UI for multi-phase proposals |
| `src/components/proposals/components/ProposalInviteButton.tsx` | Add "delivered" to the viewed-proposal resend condition (line 155) |

## Impact

- Connor can immediately edit Keystone Hatchery (system size pre-fills with 725.62, phases are individually editable)
- All multi-phase proposals will correctly show per-phase editing in the edit dialog
- The "Send Again" button will appear for delivered+viewed proposals
- No database changes needed
