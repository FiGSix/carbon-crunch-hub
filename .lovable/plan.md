

# Root Cause: `resolveClientInfo` Overrides Correct Data with Stale Data

## The Problem — One Core Bug

The system has an inverted priority. Here's what happens:

1. User edits client details on the proposal → snapshot (`content.clientInfo`) gets updated to `gm@keystonehatchery.co.za` — **correct**
2. But `client_reference_id` still points to a different `clients` record (`ops@keystonehatchery.co.za`) — **stale**
3. `resolveClientInfo()` is designed so **live join data overrides the snapshot**
4. Result: the correct snapshot data is thrown away and replaced with stale data from the wrong `clients` record

The "atomic update" fix from earlier doesn't help because the edit flow updates the `clients` record fields (name, phone, etc.) on the existing record pointed to by `client_reference_id`, but it doesn't change which record `client_reference_id` points to. When the email changes, there's now a *different* client record with that email, and the FK was never re-pointed.

## The Fix — Invert the Priority

The snapshot is what the user explicitly set. It should be the authority, not the join. The `resolveClientInfo` function currently does:

```text
CURRENT (broken):  live join data → overrides → snapshot
CORRECT:           snapshot → overrides → live join data (fallback only)
```

### File: `src/utils/proposals/resolveClientInfo.ts`

Invert the merge so the **snapshot takes precedence** over live data. Live data only fills in fields that are missing/empty in the snapshot:

```typescript
export function resolveClientInfo(
  snapshotClientInfo: Partial<ClientInformation>,
  clientRecord?: LiveClientRecord | null
): Partial<ClientInformation> {
  if (!clientRecord) {
    return snapshotClientInfo;
  }

  const liveName = [clientRecord.first_name, clientRecord.last_name]
    .filter(Boolean).join(' ').trim();

  // Snapshot takes precedence; live data is fallback for missing fields
  return {
    name: snapshotClientInfo.name || liveName || '',
    email: snapshotClientInfo.email || clientRecord.email || '',
    phone: snapshotClientInfo.phone || clientRecord.phone || '',
    companyName: snapshotClientInfo.companyName || clientRecord.company_name || '',
    registrationNumber: snapshotClientInfo.registrationNumber || clientRecord.registration_number,
    // Preserve extra snapshot fields (existingClient, address, etc.)
    ...Object.fromEntries(
      Object.entries(snapshotClientInfo).filter(
        ([k]) => !['name','email','phone','companyName','registrationNumber'].includes(k)
      )
    ),
  };
}
```

This is a single-file, single-function change. No new layers, no new abstractions.

### Why This Is Correct

- When a user edits client info on a proposal and saves, the snapshot is updated immediately — it always reflects intent
- The `clients` table record and `client_reference_id` FK are for CRM/linking purposes, not for display override
- If the snapshot is empty (e.g., old proposals before snapshots existed), the live data fills in as fallback
- The audit trail is preserved — the snapshot IS the record of what was set

### File Summary

| File | Change |
|------|--------|
| `src/utils/proposals/resolveClientInfo.ts` | Invert priority: snapshot takes precedence, live join is fallback only |

