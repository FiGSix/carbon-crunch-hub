## Problem

When a partner creates a proposal for a new client, the client is inserted into `public.clients` with `user_id = NULL` and only surfaces under **User Management → Potential Clients**. Two admin capabilities are missing for these unregistered clients:

1. The **My Clients** row (and therefore the "% Company Fee for Portfolio" action in `PortfolioClientShareDialog`) only appears once the client signs up and gets a `profiles` row.
2. If the potential client has a `company_name` typed into the proposal, no `client_companies` row is created, so the admin can't open **Company Management** for it and can't set a company-level fee either.

Net effect: strategic prospects can't have their portfolio/company fee configured until after they sign a proposal — which is exactly the wrong order.

## Proposed solution

Rather than duplicating the portfolio-share UI into User Management, **make potential clients first-class in My Clients** and **auto-create a `client_companies` row when a proposal names a company**. Same tables, same dialogs, same admin muscle memory — just no longer gated on `profiles.id` existing.

### 1. Surface potential clients in My Clients (admin only)

- Extend `UnifiedClientService.getClients` / `ClientFetcher` so that when `userRole === 'admin'`, unlinked `clients` rows (`user_id IS NULL`) are included, tagged `client_type: 'contact_prospect'`.
- Extend `ClientData` with a `has_profile: boolean` flag so the row can render a subtle "Prospect" badge next to the name.
- Agents/super-partners keep their current scoped view — no change for them.

### 2. Make the portfolio-share action work without a profile

- `PortfolioClientShareDialog` already writes to `clients.portfolio_client_share_override` by `clients.id`, and the `update-portfolio-client-share` edge function keys on `clients.id` too. Both already work for unregistered clients — we just need the row to be reachable, which #1 fixes.
- Confirm the edge function's proposal update (`.or('client_id.eq...,client_reference_id.eq...')`) matches proposals authored against a `clients.id` that has no profile yet. It does today (proposals link via `client_reference_id`), so no logic change — just verified as part of this work.

### 3. Auto-create a company record when a proposal names one

- In `manage-client-profile` / `ClientCreator.createClient`, when `companyName` is provided and no matching `client_companies` row exists, insert one and link `clients.parent_company_id` to it.
- Match is case-insensitive on trimmed `company_name`; if a company with that name already exists (agent or client type), reuse it rather than duplicating.
- Backfill migration: for every existing `clients` row where `company_name IS NOT NULL` and `parent_company_id IS NULL`, create/link a `client_companies` row. Idempotent (skip if a match already exists).

### 4. Expose Company Management from client rows

- In `SimpleClientsTable2`, when a row has a `parent_company_id`, make the company-name cell a link that navigates to `/admin/companies/:companyId` (existing `AdminCompanyDetail` route that opens `CompanyManagementDialog`).
- Admin-only affordance; agents just see the plain company name as today.

### 5. Keep User Management honest

- Potential Clients tab in User Management stays — it's still the right place to see "not yet signed up" from an identity/auth angle. Add a small helper text: "Portfolio and company fees are managed under **My Clients** and **Company Management**." No functional duplication.

## Files touched

- `src/services/unified/clients/operations/ClientFetcher.ts` — include unlinked clients for admins.
- `src/services/unified/clients/types.ts`, `src/hooks/clients/types.ts`, `src/hooks/clients/useClients.ts` — add `has_profile`.
- `src/components/clients/SimpleClientsTable2.tsx` — "Prospect" badge, company-name link to Company Management.
- `src/services/unified/clients/operations/ClientCreator.ts` and `supabase/functions/manage-client-profile/client/client-creation.ts` — create/link `client_companies` when `companyName` is provided.
- `src/components/admin/users/UserManagementTable.tsx` — small explanatory line under the Potential Clients filter.
- One migration: backfill `client_companies` from existing `clients.company_name`, link `clients.parent_company_id`.

## Out of scope

- Changing how proposals resolve their client (`client_id` vs `client_reference_id`) — untouched.
- Any change to agent/super-partner visibility of prospects.
- Merging User Management and My Clients into a single screen.
