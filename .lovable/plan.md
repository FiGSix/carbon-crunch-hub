# Plan — Partner Management: company commission, data consistency, drawer redesign

## 1. Database migration (single migration)

**a) Add company override**
```sql
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS commission_override numeric
  CHECK (commission_override >= 0 AND commission_override <= 100);
COMMENT ON COLUMN companies.commission_override IS '...';
```

**b) Backfill `proposals.company_id`** for rows where it is NULL, using the agent's earliest active `company_members` row. Scoped to `agent_id IS NOT NULL AND deleted_at IS NULL`.

**c) Rewrite `get_agents_management_data` RPC**:
- LEFT JOIN `company_members cm` (status = 'active') + `companies co`.
- `company_name = COALESCE(co.company_name, p.company_name)`.
- New columns: `company_id`, `company_commission_override`, `company_signed_kwp` (subquery: SUM of `system_size_kwp` where `company_id = co.id AND signed_at IS NOT NULL AND deleted_at IS NULL`).
- Keep per-agent counters (`total_proposals`, `active_proposals`, `signed_proposals`) unchanged.

**d) Update trigger `handle_proposal_signing_commissions`**: agent rate = `companies.commission_override` if set, else MWp tier (4% under 15 MWp, 7% at/above). `profiles.commission_override` no longer consulted.

## 2. Proposal creation (`unifiedProposalService.ts`)

- After `ensure_agent_has_company`, query `companies.commission_override` for the resolved `companyId`.
- Rate = company override (if not null) → `calculateAgentCommissionPercentage(totalCompanyPortfolio)`.
- Drop the `profiles.commission_override` select/usage.

`src/services/calculations/carbon/pricing.ts` — simplify `getAgentCommissionPercentage` to `(companyKWp: number) => number` and update call sites. The local `calculateAgentCommissionPercentage` in `unifiedProposalService.ts` likewise loses its override parameter.

## 3. PartnersTable + realtime

- Terminology sweep across `PartnerManagementHeader.tsx`, `PartnersTable.tsx`, `AgentManageDrawer.tsx`, `AdminAgentManagement.tsx`: user-facing "Agent" → "Partner" (headings, buttons, toasts, empty states, aria-labels). DB/RPC/var names unchanged.
- Extend `AgentData` with `company_id`, `company_commission_override`, `company_signed_kwp`.
- Current Rate cell:
  - `company_commission_override != null` → amber outline badge `"{x}% (Company rate)"`
  - else → `"4% (Tier)"` or `"7% (Tier)"` from `company_signed_kwp`
  - Remove individual-override branch.
- MWp Signed cell reads `company_signed_kwp / 1000`.
- Extend `useAgentsRealtime` to subscribe to `proposals` (INSERT, UPDATE on `signed_at`, DELETE) in addition to `profiles`; invalidate the same management query keys.

## 4. Partner drawer — single-panel redesign

Replace the two-tab layout in `AgentManageDrawer.tsx` with a single scrollable `Sheet` (`side="right"`, `w-full sm:max-w-[560px]`). Card style matches the table (`bg-muted/40`, muted uppercase section labels). Fresh data fetch on every open; subscribe to realtime on `profiles` and `proposals` filtered by `agent_id = partnerId` for the open drawer lifetime.

Header: name (bold), company (muted), status badge inline, close ×.

**Section 1 — Partner Details (editable)**
- Pencil button toggles edit mode. Inputs: First Name + Last Name (side by side), Phone. Email always read-only with helper "Email changes require account settings."
- Save → `UPDATE profiles SET first_name, last_name, phone WHERE id = partnerId`, toast, exit edit mode, invalidate caches. Cancel discards.

**Section 2 — Company (read-only)**
- Company name, partner's `company_members.role`, member since (`company_members.created_at`).
- "Manage company →" link to `/admin/companies/{company_id}` (only when set).

**Section 3 — Performance (live)**
- Fresh query: `proposals.select('id, system_size_kwp, signed_at, status').eq('agent_id', partnerId).is('deleted_at', null)`.
- Three stat boxes: Total Proposals, Signed Proposals (green), MWp Signed (green, 2dp). Sign rate below if total > 0. Last Active at bottom.

**Section 4 — Commission (read-only)**
- Override set → `"X% — Company rate"` + amber badge + "Managed at company level".
- Else → `"4% — MWp tier"` / `"7% — MWp tier"` + "Based on X MWp signed by company".
- Total earnings = SUM `agent_commissions.commission_amount` for `agent_id = partnerId`.
- "Adjust company rate →" link to company page. No editable inputs.

**Section 5 — Account Status**
- Status badge prominent. Buttons (disable current): Approve Partner (green, only when `pending_approval`, fires notification + `send-agent-approval-email`), Set Active, Set Inactive, Suspend. Each updates `profiles.agent_status` + toast + invalidate.

**Section 6 — Upgrade to Super Partner**
- Hidden when `pending_approval`. Outline button + Shield icon + description + AlertDialog confirmation. Calls `rpc('upgrade_agent_to_super_partner', { p_agent_id: partnerId })`, closes drawer, invalidates caches.

**Invitation variant** (`is_invitation === true`): lighter panel — name/email/status, Invited By, Expires. Buttons: Resend Invitation, Copy Invitation Link (`/register?role=agent&token=…`), Cancel Invitation (destructive + AlertDialog).

## 5. Company Management page — commission override block

In the admin company detail surface at `/admin/companies/...` (file located during implementation):
- Label "Partner commission rate override (%)" + helper text.
- Number input (0–100, step 0.1), Save, Clear (only when value set).
- Reads/writes `companies.commission_override`.
- Below input: "Effective rate: X% (override)" or "Effective rate: 4% / 7% by MWp tier".
- Save toast: "Rate applied — affects all future proposals from this company".

## 6. Super Partner page cleanup

`AdminSuperPartnerManagement.tsx`: remove the `commission_override` UI and remove `commission_override` from that page's `profiles` SELECT and interface. SP 3%/5% tier logic untouched.

## Files touched

- New migration (companies column + proposals backfill + RPC rewrite + trigger update)
- `src/services/proposals/unifiedProposalService.ts`
- `src/services/calculations/carbon/pricing.ts` (+ call sites)
- `src/components/admin/agents/types.ts`
- `src/components/admin/agents/PartnersTable.tsx`
- `src/components/admin/agents/PartnerManagementHeader.tsx`
- `src/components/admin/agents/AgentManageDrawer.tsx` (full redesign)
- `src/components/admin/agents/realtime/useAgentsRealtime.ts`
- `src/pages/AdminAgentManagement.tsx` (terminology)
- Admin company management page (commission override block)
- `src/pages/AdminSuperPartnerManagement.tsx` (remove per-SP override)

## Preserved unchanged

`AgentInvitationDialog`, `TablePagination`, `ensure_agent_has_company`, all existing `agent_commissions` / `super_partner_commissions` rows (snapshots), route paths.
