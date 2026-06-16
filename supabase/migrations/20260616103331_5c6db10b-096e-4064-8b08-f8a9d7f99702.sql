
-- 1) Company-level commission override
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS commission_override numeric
  CHECK (commission_override IS NULL OR (commission_override >= 0 AND commission_override <= 100));

COMMENT ON COLUMN public.companies.commission_override IS
  'When set, all partners in this company earn this fixed rate. Overrides MWp tier. profiles.commission_override is no longer consulted.';

-- 2) Backfill proposals.company_id
UPDATE public.proposals p
SET company_id = (
  SELECT cm.company_id
  FROM public.company_members cm
  WHERE cm.user_id = p.agent_id
    AND cm.status = 'active'
  ORDER BY cm.created_at ASC
  LIMIT 1
)
WHERE p.company_id IS NULL
  AND p.agent_id IS NOT NULL
  AND p.deleted_at IS NULL;

-- 3) Rewrite get_agents_management_data with company join + company aggregates
DROP FUNCTION IF EXISTS public.get_agents_management_data(text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_agents_management_data(
  status_filter text DEFAULT NULL::text,
  search_term text DEFAULT NULL::text,
  limit_param integer DEFAULT 50,
  offset_param integer DEFAULT 0
)
RETURNS TABLE(
  agent_id uuid,
  agent_name text,
  agent_email text,
  company_name text,
  company_id uuid,
  company_commission_override numeric,
  company_signed_kwp numeric,
  agent_status text,
  access_level text,
  commission_override numeric,
  last_active_at timestamp with time zone,
  total_proposals bigint,
  active_proposals bigint,
  signed_proposals bigint,
  total_commission numeric,
  join_date date,
  onboarding_completed boolean,
  portfolio_size_kwp numeric,
  is_invitation boolean,
  invitation_id uuid,
  invitation_token text,
  invitation_expires_at timestamp with time zone,
  invited_by_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  WITH agent_stats AS (
    SELECT
      p.agent_id,
      COUNT(*) AS total_count,
      COUNT(*) FILTER (WHERE p.status IN ('pending', 'review_later')) AS active_count,
      COUNT(*) FILTER (WHERE p.status = 'signed') AS signed_count,
      SUM(COALESCE(p.system_size_kwp, 0)) FILTER (WHERE p.status = 'signed') AS portfolio_kwp
    FROM public.proposals p
    WHERE p.deleted_at IS NULL AND p.archived_at IS NULL
    GROUP BY p.agent_id
  ),
  commission_stats AS (
    SELECT ac.agent_id, SUM(ac.commission_amount) AS total_commission
    FROM public.agent_commissions ac
    WHERE ac.commission_status = 'paid'
    GROUP BY ac.agent_id
  ),
  agent_company AS (
    SELECT DISTINCT ON (cm.user_id)
      cm.user_id,
      co.id           AS company_id,
      co.company_name AS company_name,
      co.commission_override AS company_commission_override
    FROM public.company_members cm
    JOIN public.companies co ON co.id = cm.company_id
    WHERE cm.status = 'active'
    ORDER BY cm.user_id, cm.created_at ASC
  ),
  registered_agents AS (
    SELECT
      pr.id AS agent_id,
      TRIM(CONCAT(COALESCE(pr.first_name, ''), ' ', COALESCE(pr.last_name, ''))) AS agent_name,
      pr.email AS agent_email,
      COALESCE(ac.company_name, pr.company_name) AS company_name,
      ac.company_id AS company_id,
      ac.company_commission_override AS company_commission_override,
      COALESCE((
        SELECT SUM(COALESCE(pr2.system_size_kwp, 0))
        FROM public.proposals pr2
        WHERE pr2.company_id = ac.company_id
          AND pr2.signed_at IS NOT NULL
          AND pr2.deleted_at IS NULL
      ), 0) AS company_signed_kwp,
      pr.agent_status,
      pr.access_level,
      pr.commission_override,
      pr.last_active_at,
      COALESCE(ast.total_count, 0) AS total_proposals,
      COALESCE(ast.active_count, 0) AS active_proposals,
      COALESCE(ast.signed_count, 0) AS signed_proposals,
      COALESCE(cs.total_commission, 0) AS total_commission,
      pr.join_date,
      pr.onboarding_completed,
      COALESCE(ast.portfolio_kwp, 0) AS portfolio_size_kwp,
      false AS is_invitation,
      NULL::uuid AS invitation_id,
      NULL::text AS invitation_token,
      NULL::timestamp with time zone AS invitation_expires_at,
      NULL::text AS invited_by_email
    FROM public.profiles pr
    LEFT JOIN agent_stats ast ON pr.id = ast.agent_id
    LEFT JOIN commission_stats cs ON pr.id = cs.agent_id
    LEFT JOIN agent_company ac ON ac.user_id = pr.id
    WHERE EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = pr.id
        AND ur.role IN ('agent', 'admin')
    )
    AND pr.deleted_at IS NULL
  ),
  invited_agents AS (
    SELECT
      ai.id AS agent_id,
      TRIM(CONCAT(COALESCE(ai.first_name, ''), ' ', COALESCE(ai.last_name, ''))) AS agent_name,
      ai.email AS agent_email,
      ai.company_name,
      NULL::uuid AS company_id,
      NULL::numeric AS company_commission_override,
      0::numeric AS company_signed_kwp,
      'invited' AS agent_status,
      'standard' AS access_level,
      NULL::numeric AS commission_override,
      NULL::timestamp with time zone AS last_active_at,
      0::bigint AS total_proposals,
      0::bigint AS active_proposals,
      0::bigint AS signed_proposals,
      0::numeric AS total_commission,
      NULL::date AS join_date,
      false AS onboarding_completed,
      0::numeric AS portfolio_size_kwp,
      true AS is_invitation,
      ai.id AS invitation_id,
      ai.invitation_token AS invitation_token,
      ai.expires_at AS invitation_expires_at,
      (SELECT p.email FROM public.profiles p WHERE p.id = ai.invited_by) AS invited_by_email
    FROM public.agent_invitations ai
    WHERE ai.status = 'pending'
      AND ai.expires_at > now()
  )
  SELECT * FROM (
    SELECT * FROM registered_agents
    UNION ALL
    SELECT * FROM invited_agents
  ) combined
  WHERE (status_filter IS NULL OR combined.agent_status = status_filter)
  AND (
    search_term IS NULL OR
    combined.agent_email ILIKE '%' || search_term || '%' OR
    combined.agent_name ILIKE '%' || search_term || '%' OR
    combined.company_name ILIKE '%' || search_term || '%'
  )
  ORDER BY
    CASE WHEN combined.agent_status = 'pending_approval' THEN 0 ELSE 1 END,
    CASE WHEN combined.agent_status = 'invited' THEN 0 ELSE 1 END,
    combined.last_active_at DESC NULLS LAST,
    combined.agent_name ASC
  LIMIT limit_param
  OFFSET offset_param;
END;
$function$;

-- 4) Update commission trigger to use company override → MWp tier
CREATE OR REPLACE FUNCTION public.handle_proposal_signing_commissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sp_id uuid;
  v_sp_rate numeric := 0;
  v_client_share numeric;
  v_agent_pct numeric;
  v_company_kwp numeric := 0;
  v_company_override numeric;
  v_base_rate numeric;
  v_final_rate numeric;
  v_total_client_revenue numeric;
  v_gross_revenue numeric := 0;
  v_agent_amount numeric := 0;
  v_sp_amount numeric := 0;
BEGIN
  IF NEW.signed_at IS NULL THEN RETURN NEW; END IF;
  IF NEW.agent_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.company_id IS NULL THEN
    NEW.company_id := public.ensure_agent_has_company(NEW.agent_id);
  END IF;

  SELECT super_partner_id, commission_override
    INTO v_sp_id, v_company_override
    FROM public.companies WHERE id = NEW.company_id;

  SELECT COALESCE(SUM(system_size_kwp), 0) INTO v_company_kwp
    FROM public.proposals
   WHERE company_id = NEW.company_id
     AND signed_at IS NOT NULL
     AND deleted_at IS NULL
     AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  NEW.agent_portfolio_kwp := v_company_kwp + COALESCE(NEW.system_size_kwp, 0);

  v_client_share := COALESCE(NEW.client_share_percentage, 0);
  v_total_client_revenue := COALESCE((NEW.content -> 'financials' ->> 'totalClientRevenue')::numeric, 0);

  IF v_client_share > 0 AND v_total_client_revenue > 0 THEN
    v_gross_revenue := v_total_client_revenue / (v_client_share / 100.0);
  END IF;

  v_base_rate := CASE WHEN NEW.agent_portfolio_kwp < 15000 THEN 4 ELSE 7 END;
  -- Company override wins. profiles.commission_override is no longer consulted.
  v_final_rate := COALESCE(v_company_override, v_base_rate);
  NEW.agent_commission_percentage := v_final_rate;
  v_agent_pct := v_final_rate;
  v_agent_amount := v_gross_revenue * v_final_rate / 100.0;

  IF NOT EXISTS (SELECT 1 FROM public.agent_commissions WHERE proposal_id = NEW.id) THEN
    INSERT INTO public.agent_commissions
      (agent_id, proposal_id, base_rate, override_rate, final_rate, commission_amount, commission_status, calculated_at)
    VALUES
      (NEW.agent_id, NEW.id, v_base_rate, v_company_override, v_final_rate, v_agent_amount, 'pending', now());
  END IF;

  IF v_sp_id IS NOT NULL THEN
    v_sp_rate := public.get_super_partner_rate(v_sp_id);
    v_sp_amount := v_gross_revenue * v_sp_rate / 100.0;

    NEW.super_partner_id := v_sp_id;
    NEW.super_partner_commission_percentage := v_sp_rate;

    IF NOT EXISTS (
      SELECT 1 FROM public.super_partner_commissions
       WHERE proposal_id = NEW.id AND super_partner_id = v_sp_id
    ) THEN
      INSERT INTO public.super_partner_commissions
        (super_partner_id, agent_id, proposal_id, commission_rate, commission_amount, commission_status, calculated_at)
      VALUES
        (v_sp_id, NEW.agent_id, NEW.id, v_sp_rate, v_sp_amount, 'pending', now());
    END IF;
  ELSE
    NEW.super_partner_id := NULL;
    NEW.super_partner_commission_percentage := 0;
  END IF;

  IF NOT COALESCE(NEW.platform_fee_override, false) THEN
    NEW.platform_fee_percentage := 100 - v_client_share - v_agent_pct - COALESCE(NEW.super_partner_commission_percentage, 0);
  END IF;

  RETURN NEW;
END;
$function$;
