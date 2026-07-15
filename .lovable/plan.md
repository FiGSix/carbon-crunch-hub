## Why Neo & Siyabonga are still at the default rate

Both partners *are* correctly linked:

- Neo Selwane → company `43a9a787…` → super_partner Anne Nel
- Siyabonga Mashabane → company `c1f7fbd9…` → super_partner Anne Nel
- Anne Nel has `recruit_default_commission = 7`

But both companies still have `commission_override = NULL`, so the signing trigger falls back to the MWp tier (4%).

Reason: the migration's one-shot backfill (`UPDATE companies SET commission_override = sp.recruit_default_commission …`) ran **before** the admin set Anne's `recruit_default_commission` to 7 in the new UI. The current "Save" flow calls `recalc_super_partner_rates` (which only re-rates the *SP's own* commissions), but it does **not** push `recruit_default_commission` down to the SP's already-linked recruit companies. That only happens if the admin also clicks "Apply default to existing recruits" — which was never pressed.

Net effect: setting `recruit_default_commission` today only affects *future* recruits, not existing ones, unless the admin remembers the second button.

## Fix

Two small, targeted changes — no schema changes.

### 1. Auto-cascade on save (frontend)

In `src/pages/AdminSuperPartnerManagement.tsx`, `saveCommissionOverrides`:
- After the `profiles` update, if `recruit_default_commission` was changed (or newly set), automatically call `apply_sp_default_to_recruits` for this SP before `recalc_super_partner_rates`.
- Keep the manual "Apply default to existing recruits" button for the edge case where an admin wants to re-push without changing the value.
- Toast: "Applied 7% to N linked partner companies."

### 2. One-off data repair (migration)

New migration that runs the same backfill again, now that `recruit_default_commission` values exist:

```sql
UPDATE public.companies c
   SET commission_override = sp.recruit_default_commission
  FROM public.profiles sp
 WHERE c.super_partner_id = sp.id
   AND sp.recruit_default_commission IS NOT NULL
   AND c.commission_override IS NULL;

-- Re-sync any already-signed proposals for those companies
UPDATE public.proposals p
   SET agent_commission_percentage = c.commission_override
  FROM public.companies c
  JOIN public.company_members cm ON cm.company_id = c.id
 WHERE p.agent_id = cm.user_id
   AND c.commission_override IS NOT NULL
   AND p.signed_at IS NOT NULL
   AND p.agent_commission_percentage IS DISTINCT FROM c.commission_override;
```

This will immediately set both Neo's and Siyabonga's company override to 7%, so their next proposal (and any already-signed ones) reflect 7%.

## Out of scope

- No changes to the signing trigger, `get_super_partner_rate`, or the role-lock on `/register` — those are already correct.
