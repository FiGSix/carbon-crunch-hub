
DROP VIEW IF EXISTS public.learning_metrics;

CREATE VIEW public.learning_metrics
WITH (security_invoker = true)
AS
WITH base AS (
  SELECT
    p.id,
    p.status,
    p.signed_at,
    p.archived_at,
    p.deleted_at,
    p.invitation_sent_at,
    p.invitation_viewed_at,
    p.engagement_count,
    COALESCE((p.content->'financials'->>'totalClientRevenue')::numeric, 0) AS revenue,
    public.classify_proposal_engagement(p.id) AS bucket
  FROM public.proposals p
  WHERE p.deleted_at IS NULL
),
signed AS (
  SELECT
    EXTRACT(EPOCH FROM (signed_at - invitation_sent_at)) / 86400.0 AS days_to_sign,
    signed_at
  FROM base
  WHERE signed_at IS NOT NULL
    AND invitation_sent_at IS NOT NULL
    AND signed_at > invitation_sent_at
),
viewed_unsigned AS (
  SELECT
    EXTRACT(EPOCH FROM (now() - invitation_viewed_at)) / 86400.0 AS age_days
  FROM base
  WHERE signed_at IS NULL
    AND archived_at IS NULL
    AND invitation_viewed_at IS NOT NULL
),
active AS (
  SELECT bucket FROM base
  WHERE signed_at IS NULL
    AND archived_at IS NULL
    AND invitation_sent_at IS NOT NULL
),
signed_with_agent_touch AS (
  SELECT b.id
  FROM base b
  WHERE b.signed_at IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.proposal_automation_log l
      WHERE l.proposal_id = b.id
        AND l.automation_type = 'manual_agent_contact'
        AND l.created_at <= b.signed_at
    )
)
SELECT
  -- Time-to-sign
  (SELECT round(avg(days_to_sign)::numeric, 1) FROM signed)                               AS avg_days_to_sign,
  (SELECT round((percentile_cont(0.5) WITHIN GROUP (ORDER BY days_to_sign))::numeric, 1) FROM signed) AS median_days_to_sign,
  (SELECT count(*) FROM signed WHERE signed_at > now() - interval '30 days')              AS signed_last_30d,
  (SELECT count(*) FROM signed WHERE signed_at > now() - interval '90 days')              AS signed_last_90d,

  -- Viewed but unsigned
  (SELECT count(*) FROM viewed_unsigned)                                                  AS viewed_unsigned_count,
  (SELECT round(avg(age_days)::numeric, 1) FROM viewed_unsigned)                          AS viewed_unsigned_avg_age_days,

  -- Pipeline by bucket
  count(*) FILTER (WHERE bucket = 'hot')      AS hot_count,
  count(*) FILTER (WHERE bucket = 'warm')     AS warm_count,
  count(*) FILTER (WHERE bucket = 'cold')     AS cold_count,
  count(*) FILTER (WHERE bucket = 'dead')     AS dead_count,
  count(*) FILTER (WHERE bucket = 'signed')   AS signed_count,
  count(*) FILTER (WHERE bucket = 'archived') AS archived_count,
  count(*) FILTER (WHERE bucket = 'inactive') AS inactive_count,

  -- Value by engagement
  COALESCE(sum(revenue) FILTER (WHERE bucket = 'hot'), 0)    AS hot_revenue,
  COALESCE(sum(revenue) FILTER (WHERE bucket = 'warm'), 0)   AS warm_revenue,
  COALESCE(sum(revenue) FILTER (WHERE bucket = 'cold'), 0)   AS cold_revenue,
  COALESCE(sum(revenue) FILTER (WHERE bucket = 'dead'), 0)   AS dead_revenue,
  COALESCE(sum(revenue) FILTER (WHERE bucket = 'signed'), 0) AS signed_revenue,

  -- Stale rate (cold or dead share of active pipeline)
  CASE WHEN (SELECT count(*) FROM active) = 0 THEN 0
       ELSE round(
         ((SELECT count(*) FROM active WHERE bucket IN ('cold','dead'))::numeric * 100)
         / (SELECT count(*) FROM active)::numeric,
         1
       )
  END AS stale_rate_pct,

  -- Agent-contact-to-sign conversion
  CASE WHEN count(*) FILTER (WHERE signed_at IS NOT NULL) = 0 THEN 0
       ELSE round(
         ((SELECT count(*) FROM signed_with_agent_touch)::numeric * 100)
         / count(*) FILTER (WHERE signed_at IS NOT NULL)::numeric,
         1
       )
  END AS agent_touch_to_sign_pct,

  -- Totals for context
  count(*) FILTER (WHERE signed_at IS NOT NULL)                                AS total_signed,
  (SELECT count(*) FROM active)                                                AS total_active
FROM base;

COMMENT ON VIEW public.learning_metrics IS
  'v1 Learning Engine. Single-row aggregate of time-to-sign, viewed-unsigned, bucket distribution, value-by-engagement, stale rate and agent-touch-to-sign conversion. RLS via underlying proposals.';
