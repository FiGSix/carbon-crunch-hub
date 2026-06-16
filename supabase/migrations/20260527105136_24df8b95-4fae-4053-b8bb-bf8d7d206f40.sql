CREATE OR REPLACE VIEW public.proposal_engagement_buckets AS
SELECT id AS proposal_id,
    title,
    client_id,
    agent_id,
    company_id,
    status,
    invitation_sent_at,
    invitation_viewed_at,
    last_engagement_at,
    engagement_count,
    last_email_sent_at,
    last_email_event_type,
    automation_paused,
    signed_at,
    archived_at,
    COALESCE(((content -> 'financials'::text) ->> 'totalClientRevenue'::text)::numeric, 0::numeric) AS estimated_client_revenue,
    EXTRACT(day FROM now() - invitation_sent_at)::integer AS days_since_sent,
        CASE
            WHEN last_engagement_at IS NULL THEN NULL::integer
            ELSE EXTRACT(day FROM now() - last_engagement_at)::integer
        END AS days_since_engagement,
    classify_proposal_engagement(id) AS bucket,
    client_reference_id
   FROM proposals p
  WHERE deleted_at IS NULL;