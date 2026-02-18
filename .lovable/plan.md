
# Reassign 96 Proposals from info@icsolar.co.za to ben@icsolar.co.za

## What This Does

Runs a single SQL UPDATE in the Supabase SQL Editor (Live environment selected) to move all 96 proposals from Waizeru Ladouce (`info@icsolar.co.za`) to Ben Joubert (`ben@icsolar.co.za`). After this runs, you can safely delete the `info@icsolar.co.za` agent account.

---

## The SQL to Run

Copy this entire block and run it in the **Supabase SQL Editor** (make sure "Live" is selected in the environment dropdown):

```sql
-- STEP 1: Verify counts before updating (run this first to confirm)
SELECT 
  COUNT(*) AS proposals_to_reassign,
  agent_id AS current_agent
FROM proposals
WHERE agent_id = '2fdb2569-6817-4d22-9027-079e043e65cf'
  AND deleted_at IS NULL
GROUP BY agent_id;

-- STEP 2: Reassign all proposals from info@icsolar to ben@icsolar
UPDATE proposals
SET 
  agent_id       = '76b4c999-1474-463b-8193-52f8a9a74bec',  -- ben@icsolar.co.za
  last_modified_by = '76b4c999-1474-463b-8193-52f8a9a74bec',
  updated_at     = now()
WHERE agent_id   = '2fdb2569-6817-4d22-9027-079e043e65cf'  -- info@icsolar.co.za
  AND deleted_at IS NULL;

-- STEP 3: Confirm the update worked (run after STEP 2)
SELECT 
  COUNT(*) AS proposals_now_under_ben,
  agent_id AS new_agent
FROM proposals
WHERE agent_id = '76b4c999-1474-463b-8193-52f8a9a74bec'
  AND deleted_at IS NULL
GROUP BY agent_id;

-- STEP 4: Confirm info@icsolar now has 0 proposals
SELECT 
  COUNT(*) AS remaining_info_proposals
FROM proposals
WHERE agent_id = '2fdb2569-6817-4d22-9027-079e043e65cf'
  AND deleted_at IS NULL;
```

---

## Key Details

| Field | Value |
|---|---|
| From (info@icsolar UUID) | `2fdb2569-6817-4d22-9027-079e043e65cf` |
| To (ben@icsolar UUID) | `76b4c999-1474-463b-8193-52f8a9a74bec` |
| Proposals affected | 96 (all draft, all active) |
| Clients affected | 0 (clients were created by Ben, no change needed) |
| Safe to delete info@icsolar after | Yes — once 0 proposals remain under that agent_id |

---

## After Running the SQL

Once the UPDATE confirms 96 rows changed:

1. Go to **Supabase Auth → Users** and delete `info@icsolar.co.za`
2. Go to **Profiles table** and confirm the profile row is also removed (it may cascade automatically depending on your FK setup)
3. Ben can then log in and send invitations for all 96 proposals immediately — since `agent_id` will now match `auth.uid()` for Ben, the RLS policy on the `proposals` UPDATE will pass correctly and `invitation_token` will be written successfully

---

## Technical Notes

- The `WHERE deleted_at IS NULL` clause ensures only active proposals are touched — no risk of accidentally modifying soft-deleted records
- The `last_modified_by` is set to Ben's UUID so the audit trail reflects who the proposals are now managed by
- No migration is needed — this is a data operation, not a schema change, so it is run directly in the SQL Editor
- The `agent_portfolio_kwp` cached field on each proposal may now be slightly inaccurate (it was calculated based on info@icsolar's portfolio at upload time). These figures will self-correct the next time any of these proposals are viewed/recalculated, as the dashboard metrics are calculated live from the database
