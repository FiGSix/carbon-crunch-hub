

## Root Cause Found: The Feb 17 Migration Broke the Admin Revenue Formula

### What Changed 4 Days Ago

Migration `20260217130437_137ddba9` was run on **February 17, 2026**. Its stated purpose was to **add client company membership visibility** to three RPC functions so that clients who are members of a company could see their team's proposals. That is a legitimate and correct change.

However, in rewriting the third function (`get_dashboard_metrics_by_stage`), a single line was changed in the revenue formula for the **admin/default role** (the `ELSE` branch of the `CASE` statement), and it now produces incorrect totals for admin users viewing the dashboard.

---

### The Exact Line That Changed

In the previous correct version (`20260128131807`), the admin revenue formula was:

```sql
-- CORRECT (before Feb 17):
ELSE ar.carbon_credits * v_carbon_price_6yr * ((100 - COALESCE(ar.client_share_percentage, 70) - COALESCE(ar.agent_commission_percentage, 4)) / 100.0)
```

In the Feb 17 migration (`20260217130437`), it became:

```sql
-- BROKEN (after Feb 17):
ELSE ar.carbon_credits * v_carbon_price_6yr
```

This single change removes both the `client_share_percentage` and `agent_commission_percentage` deductions entirely for the admin view. Instead of showing the **platform's net revenue** (what Crunch Carbon earns after paying the client and agent their shares), it now shows **gross carbon credit value** — the full R891.71 multiplied by all credits, with nothing deducted.

This same mistake is repeated across all three revenue cards:
- `audit_ready_revenue` — line 249
- `onboarding_revenue` — line 258  
- `pending_approval_revenue` — line 266

---

### Why the Numbers Are Wrong

Using a real example with a 100 kWp proposal (~169.74 carbon credits, 60.2% client share, 4% agent commission):

| What it shows | Formula | Result |
|---|---|---|
| **Current (broken)** | `169.74 * 891.71` | **R151,333** |
| **Correct (platform net)** | `169.74 * 891.71 * (100 - 60.2 - 4) / 100` | **R53,984** |

The dashboard is inflating revenue by approximately **2.8x** — showing total carbon value instead of Crunch Carbon's platform share.

---

### Why It Happened

The Feb 17 migration was a copy-paste of the existing function body with modifications to add `user_company_client_ids` CTE. During the copy, the `ELSE` branch of the revenue `CASE` was simplified from the three-part formula to just `ar.carbon_credits * v_carbon_price_6yr`, dropping the platform margin calculation.

The client view (`WHEN 'client'`) and agent view (`WHEN 'agent'`) were carried over correctly — those formulas still apply the right percentage. Only the admin/default `ELSE` branch was accidentally truncated.

---

### What Needs to Be Fixed

A single targeted migration to restore the three `ELSE` branches in `get_dashboard_metrics_by_stage`:

**For `audit_ready_revenue`:**
```sql
-- Change from:
ELSE ar.carbon_credits * v_carbon_price_6yr
-- To:
ELSE ar.carbon_credits * v_carbon_price_6yr * ((100 - COALESCE(ar.client_share_percentage, 70) - COALESCE(ar.agent_commission_percentage, 4)) / 100.0)
```

**For `onboarding_revenue`:**
```sql
-- Change from:
ELSE op.carbon_credits * v_carbon_price_6yr
-- To:
ELSE op.carbon_credits * v_carbon_price_6yr * ((100 - COALESCE(op.client_share_percentage, 70) - COALESCE(op.agent_commission_percentage, 4)) / 100.0)
```

**For `pending_approval_revenue`:**
```sql
-- Change from:
ELSE pp.carbon_credits * v_carbon_price_6yr
-- To:
ELSE pp.carbon_credits * v_carbon_price_6yr * ((100 - COALESCE(pp.client_share_percentage, 70) - COALESCE(pp.agent_commission_percentage, 4)) / 100.0)
```

Everything else in the Feb 17 migration — the `user_company_client_ids` CTE, the updated client role filtering, the correct MWp calculations — is correct and must be kept.

---

### No Frontend Changes Required

The hook (`useDashboardMetricsByStage`), the dashboard cards, and all display components are correct. This is a **database-only fix** — a single `CREATE OR REPLACE FUNCTION` migration restoring the three `ELSE` branches.

---

### Technical Note: Why This Keeps Recurring

Every time this function is rewritten for a different purpose (company visibility, status changes, return type changes), the revenue formula is being carried forward incorrectly. A `COMMENT ON FUNCTION` has already been added documenting the formula. The recommended fix also adds an inline code comment directly above the `ELSE` branch so the formula is self-documenting at the point of risk.

