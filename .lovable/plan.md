# Fix: "Failed to save agreement" on proposal signing

## Root cause

Edge function `accept-proposal` logs show:

```
Error creating agreement: { code: "22P02", message: 'invalid input syntax for type inet: ""' }
```

The agreement insert passes `ipAddress` straight into three Postgres `inet` columns (`ip_address`, `witness_1_ip_address`, `witness_2_ip_address`). The client is sending an empty string (likely because `fetch('https://api.ipify.org')` failed or was blocked in Robert's browser/network), and `inet` rejects `""`. The whole signing flow then returns "Failed to record agreement".

This is not specific to Robert — anyone whose browser can't reach ipify (ad blockers, corporate networks, offline) hits the same error.

## Fix

Edit `supabase/functions/accept-proposal/index.ts` only.

1. Add a small helper near the top of the handler:
   ```ts
   const sanitizeIp = (v: unknown): string | null => {
     if (typeof v !== 'string') return null;
     const t = v.trim();
     return t.length > 0 ? t : null;
   };
   ```

2. Prefer a server-derived IP over the client-supplied one. Read it from request headers (these are set by Supabase's edge runtime):
   ```ts
   const headerIp =
     req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
     req.headers.get('cf-connecting-ip') ||
     req.headers.get('x-real-ip') ||
     null;
   const safeIp = sanitizeIp(headerIp) ?? sanitizeIp(ipAddress);
   ```

3. Replace the three `ipAddress` references in the `proposal_agreements` insert (lines 316, 321, 324) with `safeIp`. `null` is valid for an `inet` column and satisfies the audit trail when no IP is available.

No DB migration, no frontend change, no change to signature/witness logic. Existing successful signatures are unaffected.

## Verification

- After deploy, re-attempt the same proposal as Robert. The accept-proposal logs should show the insert succeeding and no `22P02` error.
- Confirm `proposal_agreements` row is created with `ip_address` populated from headers (or `NULL` if headers are also empty).
