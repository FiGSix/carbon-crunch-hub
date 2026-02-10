
# Client Self-Service: Submit a Project

## What This Does

Gives clients the same proposal creation experience as agents, minus the "Client Info" step (since they ARE the client). The flow becomes:

**Eligibility → Project Info → Summary**

Clients see a "Submit a Project" link in their sidebar. The resulting proposal is created in `draft` status for admin review, with no agent involvement.

## Steps (3-step flow)

1. **Eligibility** -- Same checklist as agents (is the project in South Africa, commissioned after 2022, etc.)
2. **Project Info** -- Reuses the existing `ProjectInfoStep` component (name, address, GPS, system size, commissioning date, multi-phase support)
3. **Summary** -- Shows project details, carbon credit estimates, and revenue projections. Submit button creates the proposal.

## How It Works

- The client's own `clients` record is looked up automatically via their `user_id`
- Their name/email/company is populated from their profile -- no manual entry needed
- `agent_id` is set to a configurable "Crunch Carbon Direct" admin user ID (stored as `VITE_CRUNCH_DIRECT_AGENT_ID` env var) to maintain compatibility with existing queries that assume `agent_id` is present
- Agent commission is set to 0% for direct client submissions
- Proposal is created with `status: 'draft'` for admin review

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/SubmitProject.tsx` | Page wrapper -- 3-step form using DashboardLayout |
| `src/components/client/submit-project/ClientProposalStepper.tsx` | 3-step stepper (Eligibility, Project Info, Summary) |
| `src/components/client/submit-project/ClientSummaryStep.tsx` | Summary step adapted for client context (no client info section, submit calls client-specific service) |
| `src/services/proposals/clientProjectSubmission.ts` | Service: looks up client record by user_id, calculates carbon values, inserts proposal with agent_id set to system account, 0% agent commission |

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/submit-project` route (lazy-loaded, wrapped in PrivateRoute) |
| `src/components/layout/DashboardSidebar.tsx` | Add "Submit a Project" nav item for `client` role |
| `src/types/proposals.ts` | Add `"client_project"` to `FormStep` type as a union variant for the client-specific steps |

## Database Migration

A new RLS INSERT policy on `proposals` to allow clients to insert:

```sql
CREATE POLICY "clients_can_submit_projects"
ON public.proposals
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must have client role and not be soft-deleted
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'client'
    AND deleted_at IS NULL
  )
  -- Client must have a linked clients record
  AND client_id = auth.uid()
);
```

This sits alongside the existing `proposals_insert_unified` policy (which requires `agent_id = auth.uid()`). Both policies are checked -- either one passing allows the insert.

## Reuse Strategy

- **EligibilityStep** -- reused as-is from `src/components/proposals/EligibilityStep.tsx`
- **ProjectInfoStep** -- reused as-is from `src/components/proposals/ProjectInfoStep.tsx`
- **SummaryStep sections** -- reuses `ProjectInformationSection`, `CarbonCreditSection`, and `RevenueDistributionSection` from the existing summary. Skips `ClientInformationSection` (or shows it read-only with auto-populated data)
- **Carbon calculation utilities** -- reuses `UnifiedCarbonService`, `normalizeToKWp`, `calculateAnnualEnergy`, `calculateCarbonCredits`

## Technical Details

### Client Project Submission Service

The new `clientProjectSubmission.ts` service will:

1. Look up the client's `clients` record via `user_id = auth.uid()`
2. Build `ClientInformation` from the client record (name, email, company)
3. Calculate system values using existing carbon utilities
4. Get client portfolio size for tier-based pricing
5. Set `agent_commission_percentage = 0` (no agent)
6. Set `agent_id` to a system/admin account ID (prevents NULL issues across codebase)
7. Insert proposal with `status: 'draft'`
8. Create admin notification about the new client submission

### Navigation

Add to sidebar after "Project Onboarding":

```text
{
  name: "Submit a Project",
  href: "/submit-project",
  icon: FileText,
  roles: ["client"]
}
```

### Form Step Flow

The `SubmitProject.tsx` page manages a simplified 3-step state machine:

```text
"eligibility" --> "project" --> "summary"
```

No "client" step. The `prevStep`/`nextStep` functions skip straight between eligibility and project.
