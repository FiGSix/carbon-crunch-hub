## Issue 1 — Saved portfolio Client % override is ignored on new proposals

The admin "Portfolio Client Share" dialog **does** persist the value:

- `clients.portfolio_client_share_override` rows are being written correctly (verified in DB for Rhino Energy, Green Gables, Plumari, etc.).
- The "Apply to All" edge function bulk-updates existing proposals.

What is broken is the **forward application** of that saved override:

- `src/services/proposals/unifiedProposalService.ts` (Step 4b/4c, lines ~235-262) calculates `clientSharePercentage` purely from the tier helper `calculateClientSharePercentage(totalClientPortfolio)`.
- It never reads `clients.portfolio_client_share_override`, so every newly created proposal for an overridden client snaps back to the tier value (e.g. 60.20%) until an admin opens the dialog again and clicks "Apply to All".

That is almost certainly what the user is experiencing as "not being saved" — the value disappears from new proposals immediately after creation.

### Fix

In `unifiedProposalService.ts`, after resolving `clientId` and before computing `clientSharePercentage`:

1. Fetch the client's portfolio override:
   ```ts
   const { data: clientRow } = await supabase
     .from('clients')
     .select('portfolio_client_share_override')
     .eq('id', clientId)
     .maybeSingle();
   const portfolioClientShareOverride: number | null =
     clientRow?.portfolio_client_share_override ?? null;
   ```
2. Use it when present:
   ```ts
   const tierClientShare = calculateClientSharePercentage(totalClientPortfolio);
   const clientSharePercentage =
     portfolioClientShareOverride != null
       ? portfolioClientShareOverride
       : tierClientShare;
   ```
3. When the override is applied, also persist the audit columns on the new proposal so the lock icon and history are consistent with bulk-applied proposals:
   ```ts
   client_share_override_enabled: portfolioClientShareOverride != null,
   client_share_override_set_at: portfolioClientShareOverride != null
     ? new Date().toISOString() : null,
   client_share_override_set_by: portfolioClientShareOverride != null
     ? agentId : null,
   ```
4. Mirror the same lookup in `src/services/proposals/clientProjectSubmission.ts` (partner submit flow) so partner-created proposals for an overridden client also inherit the saved percentage.

No DB or UI changes required; the dialog and `PortfolioClientShareDialog` continue to work as-is.

## Issue 2 — Admin-created proposals show a partner fee

When an admin uses **Create Proposal**, `unifiedProposalService.ts` treats the admin as if they were a partner:

- `agentId = currentUser.id` (the admin).
- `ensure_agent_has_company` provisions/returns a "company" for the admin.
- The admin's own past proposals contribute to `companyPortfolioKWp`, then `calculateAgentCommissionPercentage(totalCompanyPortfolio)` returns 4% (<15 MWp) or 7% (≥15 MWp).
- Result: a partner-style fee appears on a proposal that has no actual partner.

`getAgentCommissionPercentage` in `src/services/calculations/carbon/pricing.ts` already documents the intended behaviour: *"If no agent involved (added by Crunch Carbon), returns 0%"* — but `hasAgent` is never passed `false` anywhere.

### Fix

In `unifiedProposalService.ts`, detect "no partner involved" and force the commission to 0:

1. Look up the creator's role once:
   ```ts
   const { data: creatorProfile } = await supabase
     .from('profiles')
     .select('role')
     .eq('id', agentId)
     .maybeSingle();
   const isAdminCreator = creatorProfile?.role === 'admin';
   ```
2. When `isAdminCreator` is true, treat the proposal as having no partner:
   ```ts
   const agentCommissionPercentage = isAdminCreator
     ? 0
     : (companyCommissionOverride != null
         ? companyCommissionOverride
         : calculateAgentCommissionPercentage(totalCompanyPortfolio));
   ```
3. Persist the intent on the proposal so downstream code (Revenue Distribution, PDF, acceptance page) stays consistent:
   - `agent_commission_percentage: 0`
   - Continue storing `agent_id = adminId` for ownership/audit, but the 0% rate means Crunch Carbon keeps the full 100% − client share.
4. In `RevenueDistributionSection.tsx`, the default fallback `?? 4` (line 63) should fall back to the proposal's saved `agent_commission_percentage` only; remove the hardcoded 4% so an admin-only proposal renders 0% instead of defaulting to 4%.
5. Leave the **Submit Project** (partner) flow untouched — partners continue to receive the tier/override commission.

### Out of scope

- No backfill of historical proposals; only newly created proposals are affected by both fixes.
- No changes to the bulk "Apply to All" edge function — it already works.
- No DB migrations.

## Files to edit

- `src/services/proposals/unifiedProposalService.ts` (both fixes)
- `src/services/proposals/clientProjectSubmission.ts` (Issue 1 only — partner submit flow)
- `src/components/proposals/summary/RevenueDistributionSection.tsx` (Issue 2 — remove hardcoded 4% fallback)
