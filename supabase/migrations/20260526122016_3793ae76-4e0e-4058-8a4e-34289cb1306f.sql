
-- Phase 2: variant stats view
CREATE OR REPLACE VIEW public.v_outreach_variant_stats AS
WITH sends AS (
  SELECT
    v.id AS variant_id,
    v.sequence_id,
    v.step_index,
    v.status,
    v.subject,
    COUNT(loh.id) FILTER (WHERE loh.status = 'sent') AS sent,
    COUNT(loh.opened_at) AS opened,
    COUNT(loh.clicked_at) AS clicked,
    COUNT(loh.id) FILTER (WHERE loh.status = 'bounced') AS bounced,
    MAX(loh.sent_at) AS last_sent_at
  FROM public.outreach_template_variants v
  LEFT JOIN public.lead_outreach_history loh ON loh.variant_id = v.id
  GROUP BY v.id
),
replies AS (
  SELECT
    r.variant_id,
    COUNT(*) AS replied,
    COUNT(*) FILTER (WHERE im.intent IN ('interested','question','meeting_request')) AS positive_replies
  FROM public.outreach_replies r
  LEFT JOIN public.inbound_messages im ON im.id = r.inbound_message_id
  WHERE r.variant_id IS NOT NULL
  GROUP BY r.variant_id
)
SELECT
  s.variant_id,
  s.sequence_id,
  s.step_index,
  s.status,
  s.subject,
  s.sent,
  s.opened,
  s.clicked,
  s.bounced,
  COALESCE(r.replied, 0) AS replied,
  COALESCE(r.positive_replies, 0) AS positive_replies,
  s.last_sent_at,
  CASE WHEN s.sent > 0 THEN ROUND(100.0 * s.opened / s.sent, 1) ELSE 0 END AS open_rate,
  CASE WHEN s.sent > 0 THEN ROUND(100.0 * s.clicked / s.sent, 1) ELSE 0 END AS click_rate,
  CASE WHEN s.sent > 0 THEN ROUND(100.0 * COALESCE(r.replied,0) / s.sent, 1) ELSE 0 END AS reply_rate,
  CASE WHEN s.sent > 0 THEN ROUND(100.0 * COALESCE(r.positive_replies,0) / s.sent, 1) ELSE 0 END AS positive_reply_rate,
  (s.sent >= 30) AS sample_size_ok
FROM sends s
LEFT JOIN replies r ON r.variant_id = s.variant_id;

ALTER VIEW public.v_outreach_variant_stats SET (security_invoker = true);
GRANT SELECT ON public.v_outreach_variant_stats TO authenticated;

-- Phase 4: AI style notes + edit signal
ALTER TABLE public.sales_agent_settings ADD COLUMN IF NOT EXISTS ai_style_notes text;
ALTER TABLE public.outreach_replies ADD COLUMN IF NOT EXISTS edit_distance integer;
ALTER TABLE public.outreach_replies ADD COLUMN IF NOT EXISTS edit_summary text;
