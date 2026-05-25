CREATE OR REPLACE FUNCTION public.classify_proposal_engagement(_proposal_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p RECORD;
  v_click_count int := 0;
  v_bounce_count int := 0;
  v_send_count int := 0;
  v_days_since_sent int;
  v_days_since_engagement int;
BEGIN
  SELECT id, status, signed_at, archived_at, deleted_at,
         invitation_sent_at, invitation_viewed_at,
         engagement_count, last_engagement_at,
         automation_paused
    INTO p
    FROM public.proposals
   WHERE id = _proposal_id;

  IF NOT FOUND THEN
    RETURN 'unknown';
  END IF;

  IF p.signed_at IS NOT NULL OR p.status = 'signed' THEN
    RETURN 'signed';
  END IF;

  IF p.archived_at IS NOT NULL OR p.deleted_at IS NOT NULL OR p.status IN ('archived','deleted') THEN
    RETURN 'archived';
  END IF;

  IF p.invitation_sent_at IS NULL THEN
    RETURN 'inactive';
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE event_type IN ('email.clicked','clicked')),
    COUNT(*) FILTER (WHERE event_type IN ('email.bounced','bounced')),
    COUNT(*) FILTER (WHERE event_type IN ('email.sent','sent'))
  INTO v_click_count, v_bounce_count, v_send_count
  FROM public.email_events
  WHERE proposal_id = _proposal_id;

  v_days_since_sent := EXTRACT(DAY FROM (now() - p.invitation_sent_at))::int;
  v_days_since_engagement := CASE
    WHEN p.last_engagement_at IS NULL THEN NULL
    ELSE EXTRACT(DAY FROM (now() - p.last_engagement_at))::int
  END;

  IF v_bounce_count > 0 THEN
    RETURN 'dead';
  END IF;
  IF v_days_since_sent >= 30 AND COALESCE(p.engagement_count, 0) = 0 THEN
    RETURN 'dead';
  END IF;
  IF v_send_count >= 2 AND COALESCE(p.engagement_count, 0) = 0 AND v_days_since_sent >= 14 THEN
    RETURN 'dead';
  END IF;

  IF v_click_count > 0
     OR COALESCE(p.engagement_count, 0) >= 3
     OR (p.invitation_viewed_at IS NOT NULL AND COALESCE(p.engagement_count, 0) >= 2) THEN
    RETURN 'hot';
  END IF;

  IF p.invitation_viewed_at IS NOT NULL
     AND v_days_since_engagement IS NOT NULL
     AND v_days_since_engagement <= 14 THEN
    RETURN 'warm';
  END IF;

  IF v_days_since_sent >= 14 THEN
    RETURN 'cold';
  END IF;

  RETURN 'warm';
END;
$$;

COMMENT ON FUNCTION public.classify_proposal_engagement(uuid) IS
  'v1 Hot/Warm/Cold/Dead classifier. Deterministic, no weighted score.';

DROP VIEW IF EXISTS public.proposal_engagement_buckets;
CREATE VIEW public.proposal_engagement_buckets
WITH (security_invoker = true)
AS
SELECT
  p.id AS proposal_id,
  p.title,
  p.client_id,
  p.agent_id,
  p.company_id,
  p.status,
  p.invitation_sent_at,
  p.invitation_viewed_at,
  p.last_engagement_at,
  p.engagement_count,
  p.last_email_sent_at,
  p.last_email_event_type,
  p.automation_paused,
  p.signed_at,
  p.archived_at,
  COALESCE((p.content->'financials'->>'totalClientRevenue')::numeric, 0) AS estimated_client_revenue,
  EXTRACT(DAY FROM (now() - p.invitation_sent_at))::int AS days_since_sent,
  CASE WHEN p.last_engagement_at IS NULL THEN NULL
       ELSE EXTRACT(DAY FROM (now() - p.last_engagement_at))::int
  END AS days_since_engagement,
  public.classify_proposal_engagement(p.id) AS bucket
FROM public.proposals p
WHERE p.deleted_at IS NULL;

COMMENT ON VIEW public.proposal_engagement_buckets IS
  'Per-proposal engagement bucket for agent dashboard. RLS via underlying proposals table.';