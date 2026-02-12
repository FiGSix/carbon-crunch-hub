

# Fix: Shaida and Kobie Can't See Texiwell Projects

## Root Cause

The proposals belong to Dr Mohammed Ahmed-Essa (the primary Texiwell client). Shaida and Kobie are **team members** in the same client company (Texiwell Investments Pty Ltd).

The **database RLS policies work correctly** -- they include a `get_user_client_company_client_ids()` check that would grant access to company team members.

However, the **frontend query in `ProposalsDataService.ts` (line 69)** adds an explicit filter that only matches proposals where `client_id` or `client_reference_id` equals the logged-in user's ID directly:

```
client_id.eq.{userId},client_reference_id.eq.{userId}
```

Since Kobie and Shaida are not the `client_id` or `client_reference_id` on any proposal, **zero rows are returned** -- the filter removes them before RLS can allow them through.

## Solution

For client users, expand the query filter to also include proposals linked to any client record in the user's company. This mirrors how agent team visibility already works.

### File: `src/services/unified/proposals/ProposalsDataService.ts`

**Change the client filtering block (around line 68-69):**

1. Look up the user's `client_company_id` from `client_company_members`
2. If they belong to a company, fetch all `clients` records in that company
3. Build the filter to include `client_reference_id` matching any of those client IDs, in addition to the direct `client_id` match

```text
Before:
  query = query.or(`client_id.eq.${userId},client_reference_id.eq.${userId}`);

After:
  // Get user's client company membership
  const { data: membership } = await supabase
    .from('client_company_members')
    .select('client_company_id')
    .eq('user_id', userId)
    .eq('status', 'active');

  const companyIds = membership?.map(m => m.client_company_id) || [];

  if (companyIds.length > 0) {
    // Get all client record IDs in user's company
    const { data: companyClients } = await supabase
      .from('clients')
      .select('id')
      .in('client_company_id', companyIds);

    const companyClientIds = companyClients?.map(c => c.id) || [];
    const allClientIds = [...new Set([...companyClientIds])];

    // Filter: direct match OR company client reference match
    const filters = [`client_id.eq.${userId}`];
    if (allClientIds.length > 0) {
      filters.push(`client_reference_id.in.(${allClientIds.join(',')})`);
    }
    query = query.or(filters.join(','));
  } else {
    // No company -- fall back to direct match only
    query = query.or(`client_id.eq.${userId},client_reference_id.eq.${userId}`);
  }
```

This is a single-file change. No database migrations needed -- the RLS policies already support this access pattern.

