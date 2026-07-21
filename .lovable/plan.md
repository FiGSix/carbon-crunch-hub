## Partners table tweaks

**1. Rename "Company rate" label**
In `src/components/admin/agents/PartnersTable.tsx`:
- Change the badge label from `{override}% (Company rate)` to `{override}% SP Rate`.
- Update `renderRate` (used by CSV export) to match: `${override}% SP Rate`.
- Keep the Tier label unchanged (`4% (Tier)` / `7% (Tier)`).

**2. Sortable MWp Signed column (+ other columns)**
Add lightweight client-side sorting on the currently-loaded rows:
- Add `sortBy` / `sortDir` state (default: `mwp` desc).
- Make these column headers clickable with an up/down chevron indicator:
  - **MWp Signed** (numeric, primary ask)
  - **Company** (alpha)
  - **Contact** (by agent name)
  - **Status** (groups Active / Invited / Expired / Inactive together)
  - **Current Rate** (numeric — Tier rate or SP override)
- Invitations (no MWp / rate) sort to the bottom regardless of direction.
- CSV export respects the current sort order.

**3. Nothing else changed**
Filters, pagination, drawer, realtime, and the underlying RPC stay as-is. No schema or backend work.

### Technical notes
- Sorting runs on `filteredRows` before pagination slicing (table already renders `filteredRows` directly).
- Header cells become `<button>`s inside `<TableHead>` for a11y; `aria-sort` set to `ascending` / `descending` / `none`.
- Sort comparator handles `null`/invitation rows by pushing them last.
