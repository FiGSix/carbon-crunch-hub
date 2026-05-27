# Permanently delete all proposals for Laurent Pieton

## Scope confirmed (from DB)

Client: **Laurent Pieton** (Metrowatt, `laurent@metrowatt.co.za`)
Client ID: `9fbce96e-e5dc-44e8-a9c1-30feaa8a066d`

Proposals owned by this client:

| Total | Drafts | Approved | Delivered | Signed |
|---|---|---|---|---|
| **517** | 517 | 0 | 0 | 0 |

All 517 are status `draft`, none signed, none delivered. Safe to hard-delete with no cession-agreement / audit-trail concerns.

## What I'll do

Run a single hard delete via the DB write tool:

```sql
DELETE FROM public.proposals
WHERE client_reference_id = '9fbce96e-e5dc-44e8-a9c1-30feaa8a066d'
   OR client_id            = '9fbce96e-e5dc-44e8-a9c1-30feaa8a066d';
```

Existing FK cascades on the `proposals` table will clean up dependent rows automatically (proposal versions, agreements, engagement, notifications, etc.). No code changes needed.

The **client record** for Laurent Pieton (and his Metrowatt company link) is **NOT** touched — only his proposals.

## Verification after run

I'll re-query and confirm `0` rows remain for that client.

## Confirmation needed

This is irreversible. Please confirm you want me to delete all **517** draft proposals for Laurent Pieton. Reply "yes, delete" and I'll proceed.
