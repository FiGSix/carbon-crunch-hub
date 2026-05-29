# SSEG → Data Access auto-fill + Portal URL defaults

## Goal

In Project Onboarding, when `meter_type = SSEG`, automatically prepopulate the **Data Access Configuration** card's **Provider** with the **Inverter Brand** entered in the Inverter section, and prepopulate **Portal URL** from an admin-editable lookup of default portal URLs per inverter brand. Only fill blank fields — never overwrite values the user has already entered.

## New DB table

`public.inverter_portal_defaults`
- `brand` (text, primary key — matches the option values in the Data Access Provider dropdown, e.g. `SunSynk`, `SolarEdge`, `Deye`, `Huawei`, …)
- `portal_url` (text)
- `notes` (text, nullable — for admins)
- standard `created_at`, `updated_at`, `updated_by`

Access:
- `GRANT SELECT` to `authenticated` (everyone in the platform can read defaults while filling onboarding).
- `GRANT INSERT/UPDATE/DELETE` to `authenticated` but gated by RLS to admins only (via `has_role(auth.uid(),'admin')`).
- `service_role` full.

Seed rows for the brands currently listed in the Provider dropdown that have a well-known portal (SunSynk → https://www.sunsynk.net, SolarEdge → https://monitoring.solaredge.com, Huawei → https://eu5.fusionsolar.huawei.com, Deye → https://www.solarmanpv.com, Growatt → https://server.growatt.com, GoodWe → https://www.semsportal.com, Fronius → https://www.solarweb.com, SMA → https://ennexos.sunnyportal.com, Enphase → https://enlighten.enphaseenergy.com, Victron → https://vrm.victronenergy.com, SungrowsenuS → https://www.isolarcloud.com, FoxESS → https://www.foxesscloud.com, GivEnergy → https://www.givenergy.cloud, Alpha ESS → https://www.alphaess.com). Brands without an obvious public portal get a row with `portal_url = NULL`.

## Frontend changes — `src/pages/ProjectOnboardingDetail/DataAccessTab.tsx`

1. In `fetchConfig`, additionally read from `onboarding_fields` for this project: `meter_type`, `inverter_brand`.
2. Also fetch all rows from `inverter_portal_defaults` once (cached in component state) to build a `brand → portal_url` map.
3. After both fetches resolve, run an **auto-fill effect** that:
   - Triggers only when `meter_type === 'SSEG'` AND `inverter_brand` is present.
   - If `config.provider` is empty → set `config.provider = inverter_brand` (when that brand exists as a Provider option; if not, set to `Other`).
   - If `config.portal_url` is empty AND the lookup map has a URL for that brand → set `config.portal_url` to it.
   - Never overwrites existing non-empty values.
4. Also wire the **Provider Select**'s `onValueChange`: if the user manually changes provider and `portal_url` is empty, prepopulate from the lookup map.
5. Show a small inline hint under Provider when the value was auto-filled from SSEG inverter brand ("Auto-filled from inverter brand — change if your monitoring portal is different.").

## Admin management of defaults

Add a lightweight admin editor at `src/components/admin/InverterPortalDefaultsTable.tsx` and mount it in the existing admin settings area (likely `src/pages/admin/...` — confirmed during build by reading the admin routes). Table view with inline edit of `portal_url` per brand, plus "Add brand" row. RLS already restricts writes to admins.

## Out of scope

- No changes to the Inverter section UI itself.
- No change to how `onboarding_fields.inverter_brand` is written — we only read it.
- No bulk migration of existing projects' Data Access rows; auto-fill happens the next time the tab is opened with empty fields.

## Files touched

- New migration: `inverter_portal_defaults` table + GRANTs + RLS + seed inserts.
- `src/pages/ProjectOnboardingDetail/DataAccessTab.tsx` — fetch onboarding fields + defaults, auto-fill effect, prepopulate-on-provider-change.
- `src/components/admin/InverterPortalDefaultsTable.tsx` (new) + mount it in the admin settings page.
