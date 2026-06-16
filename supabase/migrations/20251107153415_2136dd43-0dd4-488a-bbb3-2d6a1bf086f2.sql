-- Backfill email engagement data from invitation_sent_at for proposals without webhook events
UPDATE proposals
SET 
  last_email_event_type = 'email.sent',
  last_email_sent_at = invitation_sent_at
WHERE invitation_sent_at IS NOT NULL
  AND last_email_event_type IS NULL
  AND deleted_at IS NULL;