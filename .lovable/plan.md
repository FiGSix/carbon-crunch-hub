## Root cause

The weekly roundup shows Audit Ready projects (e.g. "48 Neptune (Goodall Group)") under "Needs client documents / cession" because `audit_ready` is never actually loaded onto the proposal objects passed into the blocker builder.

In `supabase/functions/send-weekly-roundup/index.ts`:

- `fetchAllProposals()` selects from `proposals` without any `audit_ready` value — the real flag lives on `project_onboarding.audit_ready`, joined via `proposal_id`.
- `ProposalData.audit_ready` is declared optional and is never populated.
- Aggregate metrics happen to work because they look up `onboardingMap.get(p.id)?.audit_ready`.
- But `buildAgentEmail()` passes `p.audit_ready` (always `undefined`) into `buildAgentBlockers()` and `calculateAgentRevenueLens()`.
- `buildAgentBlockers()` filters `signedProposalsForAgent.filter(p => !p.audit_ready)`; with `undefined`, every signed project is kept and re-classified against docs/cession, producing false blockers.

## Fix (two parts)

### 1. Denormalize `audit_ready` onto `proposals` (source of truth stays on `project_onboarding`)

Schema migration:

- Add column `proposals.audit_ready boolean NOT NULL DEFAULT false`.
- Add index `idx_proposals_audit_ready` on `(audit_ready)` (partial `WHERE audit_ready = true` if we want it lean).
- Backfill: `UPDATE proposals p SET audit_ready = COALESCE(po.audit_ready, false) FROM project_onboarding po WHERE po.proposal_id = p.id;`
- Trigger on `project_onboarding`:
  - `AFTER INSERT OR UPDATE OF audit_ready ON project_onboarding`
  - Function `sync_proposal_audit_ready()` (SECURITY DEFINER, `SET search_path = public`) that does `UPDATE proposals SET audit_ready = NEW.audit_ready WHERE id = NEW.proposal_id AND audit_ready IS DISTINCT FROM NEW.audit_ready;`
  - Also handle `AFTER DELETE` → reset to `false`.
- No RLS changes needed (existing proposals policies already cover the column).

### 2. Fix the weekly roundup to use the denormalized flag

In `supabase/functions/send-weekly-roundup/index.ts`:

- `fetchAllProposals()`: add `audit_ready` to the `.select(...)` list so every downstream consumer receives the real value.
- Optionally simplify the existing `onboardingMap.get(p.id)?.audit_ready` lookups in the metric functions to just read `p.audit_ready` (kept as follow-up cleanup — not required for the bug fix).
- `ProposalData.audit_ready` becomes `boolean` (non-optional).
- No changes needed in `blockers.ts` — its logic is correct once the input is truthful.

### 3. Regenerate Supabase types

After the migration runs, `src/integrations/supabase/types.ts` will regenerate automatically; frontend TypeScript will pick up the new `audit_ready` column without extra edits.

## Verification

- Backfill query result: spot-check "48 Neptune" — `proposals.audit_ready` should be `true`.
- Toggle `project_onboarding.audit_ready` on a test row and confirm the trigger mirrors the value onto `proposals`.
- Re-run the `send-weekly-roundup` edge function for the affected agent: "48 Neptune (Goodall Group)" should no longer appear under "Needs client documents / cession".
- Audit-ready totals and revenue-lens numbers should be unchanged or now correctly higher.
