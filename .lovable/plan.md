## What you're seeing

The `\n\n` in Cora's email isn't a typo in the copy — it's literal **backslash-n-backslash-n** characters showing up because the email body was stored with **escaped** newlines (the 4-character string `\n\n`) instead of real newline characters.

The HTML renderer in `supabase/functions/sales-agent-send/index.ts` does:

```ts
body.split("\n\n").map(p => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
```

That works when the body contains **real** newlines. The active sequence definition (`outreach_sequences.steps`) is stored correctly with real newlines — that path renders fine.

But the per-variant overrides stored in `outreach_template_variants.body_template` were saved with the escape sequences typed out literally (probably pasted as a JSON-ish string). I verified directly: `position(E'\n' in body_template) = 0` (no real newlines) while `position('\n' in body_template) = 19` (literal backslash-n at char 19). When the bandit picks one of those variants, the splitter doesn't match, so the whole paragraph becomes one block with visible `\n\n` text in it.

There are 3 active variants in this state — the 3 step templates Cora sends from.

## Fix (two parts, both small)

**1. Defensive normalization in the sender (one-line code change)**

In `supabase/functions/sales-agent-send/index.ts`, normalize literal escape sequences to real newlines at the top of `bodyToHtml` before splitting, so any future variant entered with escaped characters still renders correctly:

```ts
function bodyToHtml(body: string, cta?, bookings?) {
  const normalized = body.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");
  const paragraphs = normalized.split("\n\n").map(...);
  ...
}
```

This also covers `\r\n` from Windows-style paste. Pure edge-function change; redeploy `sales-agent-send` after.

**2. Clean the existing variant rows (data migration)**

Run a one-time `UPDATE` on `public.outreach_template_variants` replacing the literal `\n` (and `\r\n`) sequences with actual newlines for any row currently affected:

```sql
UPDATE public.outreach_template_variants
SET body_template = replace(replace(body_template, '\r\n', E'\n'), '\n', E'\n')
WHERE body_template LIKE '%\n%' AND position(E'\n' in body_template) = 0;
```

After this, the bandit's chosen variant renders identically to the base sequence.

**Optional hardening (not strictly needed now):** add the same normalization to whatever admin UI saves variant `body_template` (`VariantEditorDialog.tsx`) so future paste-ins are normalized before insert. I'll skip this unless you want it — it doesn't affect the current bug once the two steps above land.

## What gets shipped

- `supabase/functions/sales-agent-send/index.ts`: 1-line normalization in `bodyToHtml`, then redeploy.
- Data migration: 1 UPDATE on `outreach_template_variants`.

No schema changes, no new tables, no UI changes. Once approved I'll run both.
