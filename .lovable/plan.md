## Sync Super Partner Commission with Linked Companies

Make `companies.super_partner_id` the single source of truth, and clean up orphaned backfilled commission rows.

### 1. Migration — update RPC to scope by active company link

Replace `get_super_partner_commission_by_company()` so the join filters to companies currently linked to the calling super partner (admins still see everything):

```sql
CREATE OR REPLACE FUNCTION public.get_super_partner_commission_by_company()
RETURNS TABLE(company text, mwp numeric, rate numeric, amount numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_admin boolean := public.is_current_user_admin();
  v_rate numeric;
BEGIN
  IF NOT (v_is_admin OR public.is_super_partner(v_caller)) THEN RETURN; END IF;

  SELECT p.super_partner_commission_rate INTO v_rate
  FROM public.profiles p WHERE p.id = v_caller;

  RETURN QUERY
  SELECT
    COALESCE(NULLIF(c.company_name, ''), '—') AS company,
    COALESCE(SUM(pr.system_size_kwp), 0) / 1000.0 AS mwp,
    COALESCE(v_rate, 0) AS rate,
    COALESCE(SUM(spc.commission_amount), 0) AS amount
  FROM public.super_partner_commissions spc
  LEFT JOIN public.proposals pr ON pr.id = spc.proposal_id
  JOIN public.company_members cm ON cm.user_id = spc.agent_id
  JOIN public.companies c ON c.id = cm.company_id
  WHERE (v_is_admin OR spc.super_partner_id = v_caller)
    AND (v_is_admin OR c.super_partner_id = v_caller)
  GROUP BY COALESCE(NULLIF(c.company_name, ''), '—')
  ORDER BY company;
END;
$$;
```

This guarantees the Commission section can only surface companies that also appear under "My Companies".

### 2. Data cleanup — delete orphaned backfilled rows

Run a DELETE (via the insert tool) removing `super_partner_commissions` rows where no active link exists between the super partner and the agent's company:

```sql
DELETE FROM public.super_partner_commissions spc
WHERE NOT EXISTS (
  SELECT 1
  FROM public.company_members cm
  JOIN public.companies c ON c.id = cm.company_id
  WHERE cm.user_id = spc.agent_id
    AND c.super_partner_id = spc.super_partner_id
);
```

For Shaun this clears the 7+ stranded rows for PV Solution / Deo Solar; if those companies later get linked to him, fresh commissions will be calculated as new proposals progress.

### 3. No frontend changes

`SuperPartnerCommission.tsx` already calls the RPC and renders per-company rollups — it will simply show an empty state once orphans are removed.