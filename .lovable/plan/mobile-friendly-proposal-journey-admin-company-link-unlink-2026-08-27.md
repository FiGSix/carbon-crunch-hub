# Mobile-friendly proposal journey + admin company link/unlink

Two pieces of work: make the whole proposal journey usable on a phone, and give admins a proper way to attach or detach a person from a company.

## Part 1 — Mobile optimisation of the proposal journey

Scope: create-proposal wizard, proposals list/detail, and the client-facing signing pages.

### Create Proposal wizard
- **Stepper**: the current stepper is a fixed horizontal row with 16px connector bars and full labels, so it overflows below ~700px. Replace with a responsive version: on mobile show a compact "Step 2 of 4 — Client Info" bar with a progress indicator and icon dots; keep the full labelled stepper from `sm:` upwards.
- **Page header**: reduce the `text-3xl` title on small screens; tighten card padding so form fields get the width.
- **Step footers** (Eligibility / Client / Project): the Previous / Next pairs are `flex justify-between`. On mobile stack them full-width (primary action first, visually on top), with 44px minimum tap targets.
- **Client step**: the client-search suggestion dropdown is absolutely positioned with a hardcoded white background and grey borders — restyle with design tokens, cap height, and make rows tap-friendly. "Add Another Client" and the additional-client cards get mobile spacing and a clear remove target.
- **Project step**: multi-column grids (including the annual-kWh year grid and phase inputs) collapse to a single column on mobile; numeric fields keep `inputMode="numeric"`; the date picker popover is constrained so it never overflows the viewport.
- **Summary step**: the summary sections and revenue/carbon tables become stacked label/value rows on mobile instead of wide tables; the submit button and progress state go full-width and stay reachable (sticky action bar at the bottom of the step on small screens).
- **Keyboard behaviour**: ensure inputs are at least 16px so iOS doesn't zoom on focus, and that the sticky action bar doesn't cover the focused field.

### Proposals list and detail
- Proposals table currently relies on horizontal scroll. On mobile render a card list instead (project name, client, status badge, size, date, an actions menu), keeping the table from `md:` upwards.
- Filters/search row wraps to full-width controls on mobile.
- Proposal detail: header, info sections and the action footer (send/invite, PDF, edit, delete) stack; the action footer becomes a sticky full-width bar on mobile so "Send to client" is always reachable.
- Dialogs (edit, delete, approval signature) get mobile-safe sizing with scrollable bodies.

### Client-facing signing pages
- Acceptance page layout, party/site details, and terms sections stack cleanly at 375px.
- Signature pad: sized to the available width, correct device-pixel-ratio scaling so drawing lines up with the finger, `touch-action: none` on the canvas so the page doesn't scroll while signing, plus a clear "Clear" control and a sticky confirm button.
- Any PDF preview/download controls wrap rather than overflow.

Verification: check 375px and 414px widths on each screen, confirm no horizontal overflow and all primary actions are reachable one-handed.

## Part 2 — Admin link / unlink to a company

Today admins can only link a signed-up user to an **agent** company (`companies`), and the only way to detach someone is inside the Company Management dialog. There is no unlink from the user row, no client-company option, and no path for contact-only records.

Changes:
- **Link dialog** becomes company-type aware: choose Agent/Partner company or Client company, then pick an existing one or create a new one. Agent links write to `company_members`; client links write to `client_company_members` (with account-admin vs member role).
- **Contact-only records** (potential clients with no login) can be attached to a client company by setting their `client_company_id` on the client record, and detached by clearing it.
- **Unlink action** added to the user row menu: shows current company (and type), asks for confirmation, then removes the membership row / clears the link. Copy makes clear that proposals and history are preserved.
- **Duplicate safety**: if a membership already exists, update it instead of inserting (avoids the unique-constraint error), and re-linking to a different company replaces the previous membership rather than leaving two.
- **Feedback**: after link/unlink the user table, company filters and company details refresh so the Company Name column is immediately correct.

Only admins see these actions; permissions are enforced server-side by the existing admin policies on the membership tables.

## Technical notes
- Files touched (Part 1): `ProposalStepper.tsx`, `CreateProposal.tsx`, the step footers under `proposals/eligibility|client-info|project-info`, `ClientFormFields.tsx`, `AnnualKwhGrid.tsx`, `ProjectInfoForm.tsx`, `SummaryStep.tsx` and its summary sections, `ProposalList.tsx`, `ProposalFilters.tsx`, `proposals/view/*` (header, sections, action footer, dialogs), and the signature/acceptance components.
- Files touched (Part 2): `LinkUserToCompanyDialog.tsx` (extended), a new unlink confirmation dialog, `UserManagementTable.tsx` / `UserRow`, and `adminCompanyOperations.ts` for the client-company and contact-record link/unlink helpers.
- No new database tables are needed; existing `company_members`, `client_company_members` and `clients.client_company_id` cover both link types. A migration is only added if the existing admin RLS policies turn out not to allow admin inserts on `client_company_members`, which will be checked first.
- Styling uses existing semantic tokens and Tailwind breakpoints — no hardcoded colours, no new dependencies.
