## Goal

Reduce friction toward "Audit Ready" by surfacing **Data Access** inside the Onboarding flow instead of a separate top-level tab. Agents/clients consistently miss the standalone tab, so we'll fold it in as the 8th section of the Onboarding checklist.

## Why this works

- The "X of 7 sections complete" progress bar in `OnboardingTab.tsx` is the primary visual cue users follow. Today they hit 7/7, see 100%, and assume they're done — but `audit_ready` also requires `data_access_verified`.
- Making it 8/8 keeps the single-flow mental model: finish the Onboarding tab → project is audit-ready.

## Changes

### 1. Onboarding tab — add Data Access as 8th section
File: `src/pages/ProjectOnboardingDetail/OnboardingTab.tsx`
- Extend `sectionKeys` from 7 → 8 by adding `'dataAccess'`.
- Add a `getSectionCompletionInfo('dataAccess')` branch that reads from `data_access_configs` (provider + credential filled + `last_test_status === 'success'` → complete; otherwise count remaining fields).
- Render a new collapsible "Data Access" card at the bottom of the section list, styled identically to the others (green/amber left border, SectionBadge, same Save/Submit pattern). Embed the existing data-access form fields here, or render `<DataAccessTab>` inline as a sub-section.
- Progress bar auto-updates to "X of 8 sections complete".

### 2. Top-level tab — remove or downgrade
File: `src/pages/ProjectOnboardingDetail/index.tsx`
Two options (pick one in build):
- **A. Remove** the `data-access` TabsTrigger and TabsContent entirely. Cleanest, fewest places to keep in sync.
- **B. Keep** the tab as a deep-link/admin shortcut but rename to "Data Access (Advanced)" and add a banner pointing users back to the Onboarding tab.

Recommend **A** unless admins need the standalone view.

### 3. Audit-ready gating — unchanged
`audit_ready` still requires `data_access_verified = true` server-side. No DB/RLS/edge changes needed — we're only reorganizing the UI surface.

### 4. Copy + nudges
- Update the Onboarding tab intro copy to mention "8 sections including Data Access".
- In `OverviewTab` audit-ready checklist (if it lists Data Access separately), keep the line but link it to the Onboarding tab anchor instead of the removed tab.

## Out of scope

- No changes to `DataAccessTab.tsx` internals — reuse the component/form as-is inside the new section.
- No schema changes.
- No changes to the actual validation logic or `useDataAccessValidation` hook.

## Open questions

1. Keep the standalone Data Access tab as an admin shortcut (Option B), or remove entirely (Option A)?
2. Should the Data Access section in Onboarding be collapsed by default (since it's the most-skipped) or expanded to draw attention?
