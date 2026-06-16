## Goal

Tighten types where the SP→company migration left `as any` casts, then verify the critical path end-to-end with a mix of SQL checks I run and a short UI checklist for you.

---

## Part 1 — Type cleanup (migration-introduced casts only)

The Supabase types file is regenerated automatically after a migration runs in Lovable, so no CLI step is needed. I'll only touch casts added during the SP→company refactor and leave pre-existing JSONB casts (`eligibility_criteria`, `project_info`, etc.) alone.

**Files & casts to replace:**

1. `src/contexts/auth/AuthContext.tsx` (lines 109–110)
   - Drop `(data as any)` — `super_partner_status` and `can_create_proposals` are real columns on `profiles` in the regenerated types.

2. `src/pages/SuperPartnerMyCompanies.tsx` (lines 48, 50, 61)
   - Replace `(supabase as any).rpc("get_super_partner_companies")` with a typed call. Define a local `SuperPartnerCompanyRow` interface mirroring the RPC return shape and use `supabase.rpc("get_super_partner_companies")` directly (types now know it). Same for `request_company_link`.

3. `src/pages/AdminSuperPartnerManagement.tsx` (lines 96, 114, 116, 123, 126, 141, 160)
   - Typed `supabase.from("companies")` queries (no cast).
   - Typed `rpc("get_super_partner_companies", { p_super_partner_id })` and `rpc("backfill_super_partner_commissions", ...)` calls.
   - Keep narrow `as` casts only where the edge-function error context is genuinely untyped.

4. `src/services/proposals/unifiedProposalService.ts` (line 211)
   - Replace `(supabase as any).rpc("ensure_agent_has_company", ...)` with a typed call. Lines 277–279 are pre-existing JSONB casts — leave them.

5. `src/services/proposals/clientProjectSubmission.ts` (line 130)
   - This cast predates the migration (JSONB payload shape) — verify it's still required, leave it if so.

6. `supabase/functions/send-agent-invitation/index.ts`
   - No `as any` found; nothing to do.

After each replacement I'll let TypeScript verify there are no resulting type errors before moving on.

---

## Part 2 — Smoke test

### A. Automated SQL checks (I run these)

I'll execute read-only queries via `supabase--read_query` to verify the schema & data state:

1. **Function signatures present:**
   ```sql
   SELECT proname, pg_get_function_arguments(oid)
   FROM pg_proc
   WHERE proname IN (
     'ensure_agent_has_company','get_super_partner_companies',
     'get_super_partner_rate','backfill_super_partner_commissions',
     'handle_proposal_signing_commissions','request_company_link'
   );
   ```

2. **Schema pivot landed:**
   - `companies` has `super_partner_id`, `super_partner_linked_at`, `super_partner_linked_by`
   - `proposals` has `company_id`
   - `super_partner_link_requests` has `company_id` (no `agent_id`)
   - `profiles.super_partner_id` is gone

3. **Backfill integrity:**
   ```sql
   SELECT COUNT(*) FILTER (WHERE company_id IS NULL) AS missing,
          COUNT(*) AS total
   FROM proposals WHERE deleted_at IS NULL;
   ```

4. **Revenue path sanity** (the previously-flagged TBD):
   ```sql
   SELECT id, content->'financials'->>'totalClientRevenue'
   FROM proposals WHERE signed_at IS NOT NULL LIMIT 5;
   ```

5. **Linked-company commissions exist where expected:**
   ```sql
   SELECT c.id, c.company_name, c.super_partner_id,
          COUNT(spc.id) AS commission_rows
   FROM companies c
   LEFT JOIN super_partner_commissions spc ON spc.company_id = c.id
   WHERE c.super_partner_id IS NOT NULL
   GROUP BY c.id, c.company_name, c.super_partner_id;
   ```

I'll report each query result inline with PASS/FAIL.

### B. UI checklist (you drive — I provide the verification SQL)

For each step below I'll give you the exact verification query to paste:

| # | Action in UI | What I'll verify |
|---|---|---|
| 1 | Create a proposal as an agent who is already a company member | `proposals.company_id` matches that company |
| 2 | Create a proposal as a brand-new solo agent | A new `companies` row was auto-created with `' (Solo · …)'` suffix and the proposal is anchored to it |
| 3 | As admin, link a company to a Super Partner | `companies.super_partner_id` set; `backfill_super_partner_commissions` ran; `super_partner_commissions` rows appear for prior signed proposals of that company |
| 4 | Sign a new proposal from an agent in the linked company | New `super_partner_commissions` row with correct rate (3% or 5% based on company MWp) and correct `platform_fee_percentage` on the proposal |

For step 4 specifically I'll also confirm the agent tier (4% vs 7%) on `agent_commissions` matches the company's aggregated MWp threshold.

---

## Technical notes

- No new migrations expected; this is purely code cleanup + verification.
- If a query reveals a real bug (e.g. `company_id` left NULL on backfilled rows, wrong tier math), I'll surface it and propose a follow-up migration rather than silently patching.
- The `unifiedProposalService.ts` JSONB casts (lines 277–279) and `clientProjectSubmission.ts` line 130 cast are pre-migration and out of scope — they handle JSONB payload shapes the generated types don't narrow.

Approve and I'll start with the type cleanup, then run the SQL checks and hand you the UI checklist.
