# Knowledge Hub visibility for partners

## What I found

- All 5 resources currently in the Knowledge Hub are published, so nothing is hidden by the publish toggle.
- Regular agents (109 accounts) can see and download them — this works today.
- **Super Partners cannot.** All 6 super-partner accounts have only the `super_partner` role, and both the resource access rule and the file-download rule only allow `admin` and `agent`. They see the Knowledge Hub menu item and can open the page, but it renders empty, and any download would fail.
- Clients are intentionally excluded (no menu entry, no route access) — leaving that as is.

## Fix

Extend the two access rules to include the `super_partner` role:

1. Viewing published resources in the Knowledge Hub list.
2. Reading (downloading) the underlying files in the `knowledge-hub` storage bucket.

Admins keep full manage rights; clients stay excluded.

## Technical notes

- One migration updating the `Agents can view published resources` policy on `public.knowledge_hub_resources` and the `Authenticated users can read knowledge-hub files` policy on `storage.objects` to allow `ARRAY['admin','agent','super_partner']`.
- No frontend changes needed — the route guard and sidebar already permit `super_partner`.

## Verification

After the migration, confirm a super-partner account sees all 5 published resources and can download one.
