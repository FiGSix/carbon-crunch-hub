-- Backfill missing timestamps from email_events table
UPDATE proposals p
SET last_email_sent_at = (
  SELECT MAX(occurred_at)
  FROM email_events e
  WHERE e.proposal_id = p.id
)
WHERE p.last_email_event_type IS NOT NULL
AND p.last_email_sent_at IS NULL;