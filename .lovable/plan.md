
## Goal

Allow admins to define multiple named carbon price sets (full year → price maps) and assign one to any client. All revenue calculations (frontend, dashboards, edge functions, PDFs) will use the client's assigned set when present, otherwise fall back to the current default `system_settings.carbon_prices`.

## Database

New table `public.carbon_rate_sets`:
- `name` (text, unique) — e.g. "Default", "Premium Tier A"
- `prices` (jsonb) — `{ "2024": 78.36, "2025": 97.34, ... }`
- `is_default` (boolean) — exactly one row true; used when a client has no assignment
- standard `id`, `created_at`, `updated_at`, `created_by`

Add column to `public.clients`:
- `carbon_rate_set_id` (uuid, nullable, FK → carbon_rate_sets.id, ON DELETE SET NULL)

Migration also:
- Seeds one row named "Default" from the current `system_settings.carbon_prices` value with `is_default = true`
- Adds GRANTs (`authenticated` read; admin write via RLS + `service_role` ALL)
- RLS: any authenticated user can `SELECT` (needed for calc lookups); only admins (`has_role(auth.uid(),'admin')`) can `INSERT/UPDATE/DELETE`
- Trigger to keep exactly one `is_default = true`

The legacy `system_settings.carbon_prices` row stays as a read-through fallback so nothing breaks mid-deploy, but the app reads from `carbon_rate_sets` going forward.

## Backend / services

`src/services/carbonRateSetsService.ts` (new):
- `listRateSets()`, `getRateSet(id)`, `getDefaultRateSet()`
- `createRateSet(name, prices)`, `updateRateSet(id, {name?, prices?})`, `deleteRateSet(id)` (blocked if default or in use)
- `setDefault(id)`

`src/lib/calculations/carbon/dynamicPricing.ts`:
- Extend `dynamicCarbonPricingService` with `getCarbonPricesForClient(clientId?)` which:
  1. If `clientId` and client has `carbon_rate_set_id` → load that set
  2. Else → load `is_default = true` set
  3. Fallback to current constants if neither found
- Keep the existing `getCarbonPrices()` returning the default set so untouched call-sites keep working.

`supabase/functions/_shared/carbonPricing.ts`:
- Add `getCarbonPricesForClient(supabase, clientId?)` mirroring the frontend behavior.
- Update the edge functions that currently call `getCarbonPrices` and know a client context (proposals, dashboards, PDFs) to pass the client id.

## Calculation call-sites

Thread an optional `clientId` (or `carbonPrices` map) through the calculation entry points so the correct set is used everywhere:
- `src/services/calculations/carbon/pricing.ts` (`calculateRevenueByYear`, `calculateRevenueByYearFromKwhSync` callers)
- `src/services/calculations/carbon/UnifiedCarbonService` / `src/services/unified/*`
- `src/utils/proposals/revenueCalculators.ts`
- `src/lib/calculations/carbon/clientPricing.ts`
- Dashboard hooks that compute revenue (`useAdminVintageRevenueBreakdown`, `useAgentVintageRevenueBreakdown`, `useVintageRevenueBreakdown`, etc.)
- PDF generation (`src/utils/pdf/proposalPdfTemplate.ts`) and any proposal server functions

Where a `clientId` is available in context, pass it; sync paths receive the pre-fetched `carbonPrices` map for the client.

## Admin UI

Replace `CarbonPriceManager` with `CarbonRateSetsManager` under `System Settings`:
- List of rate sets (cards or table)
- Per set: name, "Default" badge, year/price rows, Add year, Save, Rename, "Set as default", Delete (disabled if default or referenced by any client)
- "New rate set" button (optionally clone from an existing set)
- Uses the existing look and feel

Assignment UI on the client edit/detail page:
- New "Carbon rate set" select showing all sets, defaulting to "Default"
- Admin-only field; writes `clients.carbon_rate_set_id`

## Out of scope

- Percentage/multiplier overrides
- Per-year (partial) overrides
- Bulk assignment of many clients at once
- Snapshotting historical proposals (they'll use the client's current set on recompute; if we later want frozen values we'll add a separate `proposals.carbon_prices_snapshot` column)

## Technical notes

- Reuse `has_role(auth.uid(),'admin')` for write policies (keeps `user_roles` pattern intact).
- The default-uniqueness trigger flips any other row to `false` when a new default is set, in one statement, to avoid race conditions.
- Add `carbonRateSets` query keys to `src/lib/queryKeys.ts` and invalidate after mutations.
- Existing `system_settings.carbon_prices` row is kept but no longer written to by the UI; a follow-up cleanup migration can drop it once we're confident nothing reads it.
