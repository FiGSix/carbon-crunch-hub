## Add Status Filter to Project Onboarding List

Add a Status dropdown next to the search box on `/onboarding` (Project Onboarding landing page) so admins can quickly filter projects by their lifecycle status — matching the pattern used on User Management and My Clients.

### Scope
File: `src/pages/ProjectOnboardingList.tsx`

### Changes

1. **Add status filter state**
   - New state: `statusFilter` (default `'all'`).

2. **Add Select dropdown next to search**
   - Place a shadcn `Select` beside the existing search input in the same flex row.
   - Options (match the badge labels already produced by `calculateProjectStatus`):
     - All Statuses
     - Not Started
     - In Progress
     - Awaiting Review
     - Under Review
     - Audit Ready

3. **Apply filter to the list**
   - Extend `filteredProjects` to also filter by `statusFilter` using the same `calculateProjectStatus(project).label` used to render the badge, so filter and badge stay perfectly in sync (single source of truth — no duplicated status logic).

4. **Layout**
   - Search stays as `flex-1 max-w-md`; Select sits to its right at a fixed width (~`w-[200px]`), stacking on mobile via the existing `flex items-center gap-4` container (add `flex-wrap`).

### Out of scope
- No changes to the underlying queries, badge component, StepPill, or status calculation logic.
- No changes to the legend or other pages.
