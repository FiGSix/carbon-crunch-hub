
# Remove "First Yr Est. Revenue" Column from Proposal Management

## Summary
Remove the "First Yr Est. Revenue" column from the Proposal Management table for all users, as it's not providing meaningful value.

---

## Current State
The table currently displays this column for all users (admin, agent, client) showing a calculated revenue estimate based on carbon credits.

| Project Name | Client | Date | Size | Status | Agent* | Client Share* | **First Yr Est. Revenue** | Actions |
|--------------|--------|------|------|--------|--------|---------------|---------------------------|---------|

*Admin-only columns

---

## Changes Required

### File: `src/components/proposals/ProposalList.tsx`

| Location | What to Remove |
|----------|----------------|
| Lines 42-45 | Remove `formattedRevenue` useMemo hook (no longer needed) |
| Line 127 | Remove `<TableCell className="text-center">{formattedRevenue}</TableCell>` |
| Line 141 | Remove `prevProps.proposal.revenue === nextProps.proposal.revenue` from memo comparison |
| Line 220 | Remove `<TableHead className="text-center">First Yr Est. Revenue</TableHead>` |

---

## Result

After removal, the table will have these columns:

| Project Name | Client | Date | Size | Status | Agent* | Client Share* | Actions |
|--------------|--------|------|------|--------|--------|---------------|---------|

*Admin-only columns

---

## No Database Changes Required
This is a UI-only change. The `revenue` field still exists in the data model but simply won't be displayed in this table.
