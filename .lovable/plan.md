# Plan — Partner Management redesign + SP commission override

## Change 1 — Rebuild Admin Agent Management as "Partner Management"

### Files to create
- `src/components/admin/agents/PartnerManagementHeader.tsx` — Title "Partner Management" + Users icon + "Admin Only" badge, subtitle, single right-aligned **Invite Partner** button (Mail icon) opening existing `AgentInvitationDialog`. Replaces `AgentsManagementHeader` usage on this page.
- `src/components/admin/agents/PartnersTable.tsx` — Unified table with filter row, columns, pagination, realtime, and Manage button per row. Uses existing `get_agents_management_data` RPC (status_filter passed when a specific status is selected, else null) plus a client-side filter pass for company + invitation-status. Includes:
  - Filter row: Search (max-w-xs, magnifier icon, placeholder "Search by name, email or company…"), Status `Select` (All Status / Lead / Invited / Pending / Active / Inactive / Suspended — each rendered with its badge swatch), Company `Select` (built from distinct `company_name` in current result set), Export CSV outline button (Download icon) → direct CSV of current filtered rows.
  - Columns: Company · Contact (name bold, email muted) · Status badge (Lead blue / Invited amber / Pending amber+pulse / Active green / Inactive secondary / Suspended destructive / Expired red when invitation past `invitation_expires_at`) · Current Rate (override% + outline "(Override)" badge, else tier 4%/7% by company MWp, "N/A" for invitations) · MWp Signed (sum signed `system_size_kwp` ÷ 1000, 2dp + " MWp"; "—" for invitations) · Manage (`outline sm` button).
  - Reuses `TablePagination` and `useAgentsRealtime`.
  - No checkbox column, no bulk-actions toolbar, no per-row dropdown.
- `src/components/admin/agents/AgentManageDrawer.tsx` — Right-side `Sheet` (~560px) with header (name bold, company muted, inline status badge) and two tabs:
  - **Overview**: Personal Information (2-col: Full Name, Email, Company if set, Join Date) · Account Status (status badge only — no Access Level, no Onboarding) · Performance Metrics (3 muted cards: Total / Active blue / Signed green + Success Rate if total > 0) · Commission Information (2-col: Commission Rate with override badge or tier badge + Info tooltip "Under 15 MWp: 4% / 15 MWp+: 7% / Current portfolio: X MWp"; Total Earnings ZAR green) · Recent Activity (Last Active formatted or "Never logged in").
  - **Manage**: Commission Override radio ("Use default" tier badge + tooltip / "Custom" numeric input 0–100 step 0.1 with % suffix), blue info panel, Save button → `UPDATE profiles SET commission_override`. Account Status — four buttons (Set Active / Set Inactive / Suspend / Mark Pending), current status disabled; if currently `pending_approval`, "Set Active" promoted to top as green **Approve Agent** and fires approval notification + `send-agent-approval-email` edge function. Upgrade to Super Partner — outline button with Shield icon, hidden when `pending_approval`, AlertDialog confirmation, calls `rpc('upgrade_agent_to_super_partner', { p_agent_id })`, closes drawer + invalidates caches.
  - Invitation rows render a lighter variant: Overview shows Name / Email / Company / Invited By / Expires / Status badge; Manage tab exposes only Resend Invitation, Copy Invitation Link, Cancel Invitation (destructive + confirmation).

### Files to modify
- `src/pages/AdminAgentManagement.tsx` — Replace entire body with `<PartnerManagementHeader />` + `<PartnersTable />` inside `DashboardLayout` and a `QueryErrorBoundary`. Remove imports/usage of `AgentsManagementStats`, `Tabs`, and the five tab tables. Delete the tab-counts query.
- `src/components/layout/DashboardSidebar.tsx` — Rename sidebar label "Agent Management" → "Partner Management". Keep the existing route path.
- Any other `<Link>` / nav references to "Agent Management" — rename label only, route unchanged. (Grep before editing.)

### Files to delete
- `src/components/admin/agents/AgentsManagementHeader.tsx`
- `src/components/admin/agents/AgentsManagementStats.tsx`
- `src/components/admin/agents/LeadsAgentsTable.tsx`
- `src/components/admin/agents/InvitedAgentsTable.tsx`
- `src/components/admin/agents/PendingAgentsTable.tsx`
- `src/components/admin/agents/SuspendedAgentsTable.tsx`
- `src/components/admin/agents/ActiveAgentsTable.tsx` (logic absorbed into `PartnersTable`)
- `src/components/admin/agents/BulkActionsToolbar.tsx`
- `src/components/admin/agents/AgentDetailsDialog.tsx`
- `src/components/admin/agents/CommissionOverrideDialog.tsx`
- `src/components/admin/agents/AgentStatusDropdown.tsx`
- `src/components/admin/agents/AgentsTableFilters.tsx`, `AgentsTableContent.tsx` (if no longer imported anywhere — verify first)
- Will also check `enhanced-filters/` and `export/` subfolders and only delete files no longer referenced after the rebuild.

### Preserved unchanged
`AgentInvitationDialog`, `useAgentsRealtime`, `TablePagination`, `get_agents_management_data` RPC, all existing Supabase queries/mutations, route path.

---

## Change 2 — Commission override field in Super Partner detail panel

`src/pages/AdminSuperPartnerManagement.tsx`:

1. Add `commission_override` to the `profiles` SELECT in `loadAll` and to the `SuperPartner` interface (`commission_override: number | null`).
2. Add local state inside the component: `const [commissionOverride, setCommissionOverride] = useState<number | null>(null);` and a `useEffect` that syncs it from the currently selected SP whenever `selectedSP` changes.
3. Inside the inline detail panel (the `selectedSP &&` Card), conditionally render — only when `sp.can_create_proposals === true` — a "Proposal commission override (%)" block with:
   - Label + helper text ("Leave blank to use the standard tier rate (4% / 7% by company MWp). Set a number to fix this SP's agent commission at that exact rate.").
   - Number input (0–100, step 0.1, w-32), Save button, and a ghost "Clear (use tier)" button when value is set.
4. Add `handleSaveCommissionOverride(override?)` that updates `profiles.commission_override` for `sp.id` and toasts success/failure, then refreshes `loadAll()`.

No changes to `calculateAgentCommissionPercentage` — it already honours `commission_override` before falling back to tier logic.

---

## Technical notes

- Status badge styling lives in a shared local helper inside `PartnersTable.tsx` so the Status `<Select>` options and table cells share one source of truth.
- Company filter list rebuilds whenever the RPC result changes (`useMemo` over distinct non-null `company_name`).
- CSV export writes the currently filtered rows directly via a `Blob` download — does not reuse `ExportDialog` (that dialog is column-pickable and heavier than required here).
- Realtime + pagination behaviour mirrors current `ActiveAgentsTable`; status filter passed to RPC as the selected `agent_status`, with `is_invitation` filtering applied client-side post-RPC for the "Invited" option.
- Drawer uses shadcn `Sheet` with `side="right"` and `className="w-full sm:max-w-[560px]"`.
