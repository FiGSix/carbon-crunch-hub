
# Fix: Partner API Proposals Display Identically to Normal Proposals

## Root Cause Analysis

There are **three separate bugs** all caused by the same underlying issue: the partner API stores data in a different shape than the normal proposal creation flow expects.

### Bug 1 — System Size Shows "0 kWp"

The `ProposalDetails` component reads `projectInfo.size` (a string, e.g. `"3.6"`) to render the system size and to decide whether to show the `CarbonCreditSection` and `RevenueDistributionSection`:

```typescript
// ProposalDetails.tsx line 114
{(projectInfo.size || ...) && (
  <CarbonCreditSection systemSize={projectInfo.size || ...} />
)}
```

The partner API stores size in `content.projectInfo.system_size_kwp` (a number) and also uses `commissioning_date` (snake_case) instead of `commissionDate` (camelCase):

```json
// Partner API stores:
"projectInfo": {
  "system_size_kwp": 3.6,       ← number, not "size" string
  "commissioning_date": "2022-10-18",  ← snake_case
  "name": "Mario Solar Home",
  "address": "19 Chris Erwee Close..."
}
```

Normal proposals store:
```json
"projectInfo": {
  "size": "3.6",              ← string key "size"
  "commissionDate": "2022-10-18",  ← camelCase
  ...
}
```

Because `projectInfo.size` is `undefined` for partner proposals, the `CarbonCreditSection` and `RevenueDistributionSection` are **never rendered** — so the proposal shows no carbon credit data and no revenue figures.

### Bug 2 — The RPC Doesn't Return `system_size_kwp` or `project_info`

The `get_proposal_by_token_direct` database function (used for token-based access) only returns:

```
id, title, status, content, agent_id, client_id, client_reference_id,
signed_at, created_at, archived_at, review_later_until, is_preview,
preview_of_id, client_email, invitation_token, invitation_expires_at,
annual_energy, carbon_credits, client_share_percentage
```

It is **missing** `system_size_kwp` and `project_info`. Even if the content normalization was fixed, a token-accessed partner proposal would still show `0 kWp` because `system_size_kwp` is never returned from the RPC.

### Bug 3 — Client Name Is Blank / Partial

The partner API sends client data with separate `first_name` / `last_name` fields alongside a `name` field:

```json
"clientInfo": {
  "first_name": "Mario",
  "last_name": "Morelli",
  "name": "Mario Morelli",
  "email": "...",
  "phone": "..."
}
```

This part actually works (the `name` field is present), so client name displays correctly. However `companyName` is stored as `company_name` in the partner payload which means company doesn't display. Minor issue.

---

## The Fix — Three Parts

### Fix 1 — Normalize Partner API Content on Creation (Edge Function)

**File:** `supabase/functions/partner-api/index.ts` (~line 583)

When building `content` to insert into the proposals table, normalize the `projectInfo` shape to match what the frontend expects:

```typescript
// BEFORE (current — partner API format):
content: {
  clientInfo: data.client,  // has first_name, last_name, company_name (snake_case)
  projectInfo: data.project, // has system_size_kwp, commissioning_date (snake_case)
},

// AFTER (normalized — frontend expects):
content: {
  clientInfo: {
    name: `${data.client.first_name} ${data.client.last_name}`.trim(),
    email: data.client.email,
    phone: data.client.phone || '',
    companyName: data.client.company_name || '',  // camelCase
  },
  projectInfo: {
    name: data.project.name,
    address: data.project.address,
    size: String(data.project.system_size_kwp),  // "size" string key
    commissionDate: data.project.commissioning_date, // camelCase
    isMultiPhase: false,
    additionalNotes: '',
  },
},
```

This ensures all **new** partner proposals display correctly going forward.

### Fix 2 — Add `system_size_kwp` and `project_info` to the Token RPC

**File:** Database migration — `supabase/migrations/[timestamp]_fix_proposal_token_rpc.sql`

Update `get_proposal_by_token_direct` to also return `system_size_kwp` and `project_info`:

```sql
ALTER FUNCTION get_proposal_by_token_direct ... 
-- Add to RETURNS TABLE:
system_size_kwp numeric,
project_info jsonb,
-- Add to SELECT:
p.system_size_kwp,
p.project_info,
```

Then update `transformToProposalData` in the frontend to map `system_size_kwp` from the RPC response (it already maps it from direct DB queries, but the RPC shape is missing it).

### Fix 3 — Normalize `projectInfo` in `transformToProposalData`

**File:** `src/utils/proposals/simplifiedTransformers.ts`

After fetching, normalize `content.projectInfo` to handle both partner API format and normal format:

```typescript
export function transformToProposalData(rawProposal: any): ProposalData {
  const rawContent = rawProposal.content || {};
  const rawProjectInfo = rawContent.projectInfo || {};

  // Normalize projectInfo to always use frontend camelCase format
  const normalizedProjectInfo = {
    ...rawProjectInfo,
    // Handle partner API snake_case → camelCase
    size: rawProjectInfo.size 
      || (rawProjectInfo.system_size_kwp ? String(rawProjectInfo.system_size_kwp) : '')
      || (rawProposal.system_size_kwp ? String(rawProposal.system_size_kwp) : ''),
    commissionDate: rawProjectInfo.commissionDate 
      || rawProjectInfo.commissioning_date 
      || '',
    companyName: rawProjectInfo.companyName || rawProjectInfo.company_name || '',
    isMultiPhase: rawProjectInfo.isMultiPhase || false,
    additionalNotes: rawProjectInfo.additionalNotes || '',
  };

  // Normalize clientInfo camelCase
  const rawClientInfo = rawContent.clientInfo || {};
  const normalizedClientInfo = {
    ...rawClientInfo,
    name: rawClientInfo.name 
      || `${rawClientInfo.first_name || ''} ${rawClientInfo.last_name || ''}`.trim(),
    companyName: rawClientInfo.companyName || rawClientInfo.company_name || '',
  };

  return {
    ...existing fields,
    content: {
      ...rawContent,
      clientInfo: normalizedClientInfo,
      projectInfo: normalizedProjectInfo,
    },
    system_size_kwp: rawProposal.system_size_kwp,
    // ...
  };
}
```

---

## What This Fixes for the Existing "Mario Solar Home" Proposal

The Mario Solar Home proposal (`176b0b3c`) is already `approved` and has the data correctly stored in `system_size_kwp = 3.6` and `carbon_credits = 6.11`. The fix to `transformToProposalData` (Fix 3) means that when this proposal is loaded, it will correctly read `content.projectInfo.system_size_kwp = 3.6` → normalize to `size = "3.6"` → render the `CarbonCreditSection` and `RevenueDistributionSection` properly.

---

## Files to Change

| File | Change |
|---|---|
| `supabase/functions/partner-api/index.ts` | Normalize `content.clientInfo` and `content.projectInfo` to camelCase frontend format at creation time (Fix 1) |
| `supabase/migrations/[ts]_fix_proposal_token_rpc.sql` | Add `system_size_kwp` and `project_info` to `get_proposal_by_token_direct` return columns (Fix 2) |
| `src/utils/proposals/simplifiedTransformers.ts` | Normalize `projectInfo` and `clientInfo` in `transformToProposalData` to handle both partner API snake_case and normal camelCase formats (Fix 3) |

Fix 3 is the most impactful — it makes the existing approved "Mario Solar Home" proposal display correctly immediately. Fixes 1 and 2 ensure all future partner proposals work correctly at creation and token-access time.

No schema changes are required. No new tables are needed.
