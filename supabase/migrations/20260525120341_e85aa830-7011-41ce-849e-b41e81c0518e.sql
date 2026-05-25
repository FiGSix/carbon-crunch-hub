
DROP VIEW IF EXISTS public.portfolio_reminder_candidates;

CREATE VIEW public.portfolio_reminder_candidates
WITH (security_invoker = true)
AS
WITH unsigned AS (
  SELECT
    b.client_id, b.agent_id, b.company_id,
    lower(coalesce(p.content->'clientInfo'->>'email','')) AS client_email,
    coalesce(p.content->'clientInfo'->>'fullName','') AS client_name,
    b.proposal_id, b.bucket, b.estimated_client_revenue,
    b.invitation_sent_at, b.last_engagement_at
  FROM public.proposal_engagement_buckets b
  JOIN public.proposals p ON p.id = b.proposal_id
  WHERE b.bucket IN ('hot','warm','cold')
    AND b.signed_at IS NULL
    AND b.archived_at IS NULL
    AND coalesce(b.automation_paused, false) = false
),
agg AS (
  SELECT
    client_email,
    (array_agg(client_name ORDER BY invitation_sent_at DESC NULLS LAST))[1] AS client_name,
    (array_agg(client_id   ORDER BY invitation_sent_at DESC NULLS LAST))[1] AS client_id,
    (array_agg(agent_id    ORDER BY invitation_sent_at DESC NULLS LAST))[1] AS agent_id,
    (array_agg(company_id  ORDER BY invitation_sent_at DESC NULLS LAST))[1] AS company_id,
    count(*) AS unsigned_count,
    sum(estimated_client_revenue) AS combined_revenue,
    count(*) FILTER (WHERE bucket = 'warm') AS warm_count,
    count(*) FILTER (WHERE bucket = 'hot')  AS hot_count,
    array_agg(proposal_id) AS proposal_ids,
    max(last_engagement_at) AS last_engagement_at
  FROM unsigned
  WHERE client_email <> ''
  GROUP BY client_email
),
last_portfolio_send AS (
  SELECT lower(recipient_email) AS email, max(occurred_at) AS last_sent_at
  FROM public.email_events
  WHERE event_type IN ('sent','delivered','email.sent','email.delivered')
    AND (
      coalesce(raw_payload->>'template','') = 'portfolio_reminder'
      OR coalesce(raw_payload->'tags'->>'template','') = 'portfolio_reminder'
      OR coalesce(subject,'') ILIKE '%portfolio%'
    )
  GROUP BY lower(recipient_email)
)
SELECT
  a.client_email, a.client_name, a.client_id, a.agent_id, a.company_id,
  a.unsigned_count, a.combined_revenue, a.warm_count, a.hot_count,
  a.proposal_ids, a.last_engagement_at,
  lps.last_sent_at AS last_portfolio_reminder_at,
  (
    (a.unsigned_count >= 2 OR a.combined_revenue >= 500000)
    AND a.warm_count >= 1
    AND public.can_send_client_email(a.client_email, 7)
    AND (lps.last_sent_at IS NULL OR lps.last_sent_at < now() - interval '14 days')
  ) AS eligible_for_email,
  (
    (a.unsigned_count >= 2 OR a.combined_revenue >= 500000)
    AND NOT (
      a.warm_count >= 1
      AND public.can_send_client_email(a.client_email, 7)
      AND (lps.last_sent_at IS NULL OR lps.last_sent_at < now() - interval '14 days')
    )
  ) AS route_to_agent
FROM agg a
LEFT JOIN last_portfolio_send lps ON lps.email = a.client_email;

COMMENT ON VIEW public.portfolio_reminder_candidates IS
  'v1 Layer B gate. eligible_for_email -> portfolio reminder safe to send. route_to_agent -> agent review task.';
