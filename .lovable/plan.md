
# Fix: Sync Onboarding System Size Back to the Proposal

## The Problem in Plain English

When an agent creates a proposal, they estimate the solar system size (e.g., 20 kWp). That estimate gets stored in `proposals.system_size_kwp` and immediately drives revenue projections, carbon credit calculations, and PDF output.

Later, during onboarding, the actual installed system size is confirmed. It is stored in `onboarding_fields.panel_total_kwp`. But that confirmed number is **never written back** to `proposals.system_size_kwp`. The proposal — and everything that reads from it — stays frozen at the original estimate forever, even if the real size is different.

---

## What Currently Syncs vs. What Does Not

| Onboarding Field | Proposal Field | Currently Syncs? |
|---|---|---|
| `system_name` | `proposals.title` + `project_info.name` | YES |
| `panel_total_kwp` | `proposals.system_size_kwp` | **NO** |
| `panel_total_kwp` | `proposals.annual_energy` | **NO** |
| `panel_total_kwp` | `proposals.carbon_credits` | **NO** |

---

## What Reads From `proposals.system_size_kwp`

Fixing this is important because the following all read from the proposal, not from onboarding fields:

- **Revenue Tab** (`RevenueTab.tsx`) — uses `proposal.system_size_kwp` to calculate 20-year revenue projections shown to the client
- **Overview Tab** (`OverviewTab.tsx`) — displays system size as `{proposal.system_size_kwp} kWp`
- **PDF / Proposal document** — generated from proposal data
- **Dashboard portfolio totals** — sum `system_size_kwp` across all proposals for portfolio tier calculations

---

## The Fix

### Location: `src/pages/ProjectOnboardingDetail/OnboardingTab.tsx`

The existing `handleSaveDraft` function (lines 352–417) already has a cascade sync block for `system_name`. The fix extends that same block to also sync `panel_total_kwp` → `proposals.system_size_kwp`, and recalculate `annual_energy` and `carbon_credits` from the new size.

The `handleValidateAndComplete` function (lines 419–571) also saves fields before completing — it must perform the same sync, since admins often complete onboarding without calling Save Draft first.

### Exact Change to `handleSaveDraft`

```
Before (lines 370–399):
// Cascade sync system_name to proposals table
if (formData.system_name) {
  ...
  await supabase
    .from('proposals')
    .update({
      title: formData.system_name,
      project_info: updatedProjectInfo
    })
    .eq('id', projectData.proposal_id);
}

After:
// Cascade sync system_name AND panel_total_kwp to proposals table
const shouldSync = formData.system_name || formData.panel_total_kwp;
if (shouldSync) {
  const { data: projectData } = await supabase
    .from('project_onboarding')
    .select('proposal_id')
    .eq('id', projectId)
    .single();

  if (projectData?.proposal_id) {
    const updatePayload: Record<string, any> = {};

    if (formData.system_name) {
      const { data: proposalData } = await supabase
        .from('proposals')
        .select('project_info')
        .eq('id', projectData.proposal_id)
        .single();

      const currentProjectInfo = (proposalData?.project_info as Record<string, unknown>) || {};
      updatePayload.title = formData.system_name;
      updatePayload.project_info = { ...currentProjectInfo, name: formData.system_name };
    }

    if (formData.panel_total_kwp) {
      const newSizeKwp = formData.panel_total_kwp;
      updatePayload.system_size_kwp = newSizeKwp;
      updatePayload.annual_energy = calculateAnnualEnergy(newSizeKwp);
      updatePayload.carbon_credits = calculateCarbonCredits(newSizeKwp);
    }

    if (Object.keys(updatePayload).length > 0) {
      await supabase
        .from('proposals')
        .update(updatePayload)
        .eq('id', projectData.proposal_id);
    }
  }
}
```

### Same Logic Added to `handleValidateAndComplete`

After the fields upsert succeeds (line ~462), the same proposal sync block will be added — so that when an admin clicks "Validate & Complete" without having pressed Save Draft first, the proposal still gets the updated size.

---

## Important Guardrails

The fix will only sync when `panel_total_kwp` is a positive number, to prevent accidentally zeroing out a proposal that hasn't had panel data entered yet. There is no automatic recalculation of `client_share_percentage` or `agent_commission_percentage` — those tier-based values involve portfolio-wide lookups and are intentionally left unchanged (they were set at proposal creation and should only change via admin override).

---

## Files Changed

| File | Change |
|---|---|
| `src/pages/ProjectOnboardingDetail/OnboardingTab.tsx` | Extend `handleSaveDraft` and `handleValidateAndComplete` to sync `panel_total_kwp` → `proposals.system_size_kwp`, `annual_energy`, `carbon_credits` |

No database migrations. No RLS changes. No edge functions. One file, two functions.
