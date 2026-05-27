## Root cause: Robert couldn't sign because the typed-name validator required punctuation

The signing button is gated by `validateTypedName()` in `src/pages/ProposalAcceptance/index.tsx`:

```ts
const clientWords = clientName.toLowerCase().split(/\s+/);
return clientWords.every(word => typed.toLowerCase().includes(word));
```

Every whitespace-separated "word" of the resolved client name — **including any punctuation glued to it** — must appear inside what the client types.

For this proposal the resolved client name was **"R. Blake"** (from `content.clientInfo.firstName = "R."` and the now-deleted client record `878c9f68` which also had `first_name = "R."`). The two words the validator needed were `["r.", "blake"]`. If Robert typed his real name **"Robert Blake"**, the substring `"r."` (with the period) is not present in `"robert blake"`, so `canSubmit` stayed `false` and the Submit button stayed disabled. The only string that would have worked was literally **"R. Blake"** — which most people don't type as their signature.

There are no `accept-proposal` edge-function logs for this proposal, confirming he never got past the client-side check — the request was never even sent.

## Did the duplicate cleanup resolve it?

**Yes, partially — and probably fully in practice.**

`resolveClientInfo()` merges live `clients` data over the snapshot, with live winning. After this morning's cleanup:
- `proposal.client_reference_id` now points to client `6104faa8…` whose `first_name = 'Robert'`, `last_name = 'Blake'`.
- So the resolved name presented to the validator is now **"Robert Blake"** → required words `["robert","blake"]`.
- Robert typing **"Robert Blake"** now satisfies the check and the Submit button enables.

The snapshot in `proposal.content.clientInfo` still says "R. Blake", but the live client overrides it for both display and validation. Before cleanup, the live client (`878c9f68…`) was also "R. Blake" — so the live-override did not save him then; the cleanup is what actually unblocks signing.

Side note: prior to cleanup the snapshot value was identical to the live value, so even if `fetchClientRecord` had failed silently (404 etc.) the fallback name was still "R. Blake" and he'd still have been stuck. No code path let him past it.

## Recommendation (separate, small fix)

The validator is the real bug — punctuation-sensitive fuzzy matching is fragile and will hit other clients (initials, titles like "Dr.", hyphens, accents). Suggested fix (one-line, frontend-only):

```ts
const normalize = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

const validateTypedName = (): boolean => {
  const expected = normalize(getClientName());
  const typed    = normalize(typedName);
  if (!expected) return typed.length >= 2;
  return expected.split(' ').every(w => w.length === 0 || typed.includes(w));
};
```

This strips punctuation/diacritics on both sides so "R. Blake" matches "Robert Blake" matches "r blake" matches "Róbert Blaké". Pure UI change in `src/pages/ProposalAcceptance/index.tsx` — no backend, no schema.

## Next step

Switch to build mode and I'll apply the validator fix. Robert should already be able to sign as-is (typing "Robert Blake") because of the client merge — but the validator hardening prevents the same trap for any other client whose stored name has initials/punctuation.
