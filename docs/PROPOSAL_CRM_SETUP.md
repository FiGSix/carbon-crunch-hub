# Proposal CRM System - Setup & Configuration Guide

## Overview

The Proposal CRM System is a comprehensive email automation and engagement tracking solution for managing carbon credit proposals. It integrates with Resend for email delivery and Supabase for backend functionality.

---

## 🚀 Quick Start Checklist

- [ ] Resend account created and API key configured
- [ ] Resend domain verified
- [ ] Webhook endpoint configured in Resend dashboard
- [ ] Database migrations applied
- [ ] Edge functions deployed
- [ ] Cron job scheduled and active
- [ ] Test email sent and tracked

---

## 📋 Detailed Setup Instructions

### 1. Resend Configuration

#### Create Resend Account
1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free or paid account
3. Verify your email address

#### Verify Your Domain
1. Navigate to [Domains](https://resend.com/domains)
2. Add your domain (e.g., `crunchcarbon.com`)
3. Add the provided DNS records to your domain registrar:
   - SPF record
   - DKIM records
   - DMARC record (optional but recommended)
4. Wait for DNS propagation (can take up to 48 hours)
5. Click "Verify" in Resend dashboard

#### Get API Key
1. Navigate to [API Keys](https://resend.com/api-keys)
2. Create a new API key
3. Copy the key (you won't be able to see it again!)
4. Store it securely in your Supabase secrets as `RESEND_API_KEY`

#### Configure Webhook
1. Navigate to [Webhooks](https://resend.com/webhooks)
2. Click "Add Endpoint"
3. Enter webhook URL:
   ```
   https://uyjryuopuqgmsvayiccl.supabase.co/functions/v1/resend-webhook
   ```
4. Select events to subscribe to:
   - ✅ `email.sent`
   - ✅ `email.delivered`
   - ✅ `email.opened`
   - ✅ `email.clicked`
   - ✅ `email.bounced`
   - ⚪ `email.complained` (optional)
5. Click "Create Endpoint"
6. Copy the webhook signing secret (if you want to verify webhook signatures)

---

### 2. Database Schema

All database migrations have been applied automatically. The system includes:

**Tables:**
- `email_events` - Stores all email events from Resend
- `proposal_automation_log` - Tracks automation actions
- `proposals` - Enhanced with engagement tracking fields

**New Proposal Fields:**
- `engagement_count` - Number of email interactions
- `last_engagement_at` - Timestamp of last engagement
- `last_email_event_type` - Type of last email event
- `last_email_sent_at` - When last email was sent
- `automation_paused` - Whether automation is paused
- `automation_pause_reason` - Reason for pausing

**Functions:**
- `increment_proposal_engagement()` - Updates engagement metrics
- `can_transition_proposal_status()` - Validates status transitions
- `update_proposal_status_with_log()` - Updates status with audit log

---

### 3. Edge Functions

#### Deployed Functions

**resend-webhook**
- **Purpose**: Receives and processes Resend webhook events
- **Authentication**: Public (no JWT verification)
- **URL**: `https://uyjryuopuqgmsvayiccl.supabase.co/functions/v1/resend-webhook`
- **Events Handled**:
  - `email.sent` - Updates proposal status to 'sent'
  - `email.delivered` - Updates status to 'delivered'
  - `email.opened` - Increments engagement, updates to 'opened'
  - `email.clicked` - Increments engagement, updates to 'viewed'
  - `email.bounced` - Updates status to 'bounced'

**proposal-automation**
- **Purpose**: Runs daily to send follow-up emails
- **Authentication**: Public (called by cron)
- **URL**: `https://uyjryuopuqgmsvayiccl.supabase.co/functions/v1/proposal-automation`
- **Schedule**: Daily at 9:00 AM UTC
- **Actions**:
  - Sends reminders for unopened proposals (after 3 days)
  - Sends follow-ups for opened but not viewed (after 2 days)
  - Marks proposals as stale (after 14 days of inactivity)

**send-proposal-invitation**
- **Purpose**: Sends initial proposal invitation emails
- **Authentication**: Requires JWT
- **Enhancements**: Stores message_id for webhook tracking

---

### 4. Automation Rules

#### Email Follow-up Logic

```
Proposal Status Flow:
draft → sent → delivered → opened → viewed → accepted/declined
                    ↓          ↓        ↓
                 bounced    stale    stale
```

**Rule 1: Reminder for Delivered (Not Opened)**
- Trigger: 3 days after last email sent
- Condition: Status = 'delivered' AND no opens
- Action: Send reminder email
- Frequency: Once every 3 days

**Rule 2: Follow-up for Opened (Not Viewed)**
- Trigger: 2 days after last email sent
- Condition: Status = 'opened' AND not viewed
- Action: Send follow-up email
- Frequency: Once every 2 days

**Rule 3: Reminder for Sent (Not Delivered)**
- Trigger: 3 days after last email sent
- Condition: Status = 'sent' AND not delivered
- Action: Send reminder email
- Frequency: Once every 3 days

**Rule 4: Mark as Stale**
- Trigger: 14 days after last email sent
- Condition: No engagement in 14 days
- Action: Update status to 'stale'
- Frequency: Once

#### Pausing Automation

Agents can pause automation for individual proposals:
1. Navigate to proposal details
2. Toggle "Auto Follow-ups" switch
3. Provide reason for pausing
4. Confirm action

When paused, the proposal will be skipped by the automation function.

---

### 5. Cron Job Configuration

The automation runs daily via pg_cron:

```sql
SELECT cron.schedule(
  'proposal-automation-daily',
  '0 9 * * *', -- Every day at 9 AM UTC
  $$
  SELECT net.http_post(
    url:='https://uyjryuopuqgmsvayiccl.supabase.co/functions/v1/proposal-automation',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer [ANON_KEY]"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);
```

**To verify the cron job is active:**
```sql
SELECT * FROM cron.job WHERE jobname = 'proposal-automation-daily';
```

**To manually trigger automation:**
```bash
curl -X POST \
  https://uyjryuopuqgmsvayiccl.supabase.co/functions/v1/proposal-automation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [ANON_KEY]" \
  -d '{"time": "manual-trigger"}'
```

---

## 📊 UI Features

### For Agents

**Engagement Dashboard**
- Total proposals sent
- Engagement rate with quality indicators
- Average time to open
- Link click tracking
- Status breakdown (bounced/stale/active)

**Advanced Filters**
- Engagement level: High/Medium/Low/None
- Automation status: Active/Paused
- Email status: Sent/Delivered/Opened/Clicked/Bounced

**Proposal Details**
- Email Activity Timeline (shows all email events)
- Automation Toggle (pause/resume automation)
- Engagement badges on proposal list

### For Clients

- No changes to client view
- Email tracking is transparent to clients
- They receive professionally designed emails

---

## 🧪 Testing Guide

### Test 1: Send Proposal Invitation

1. Create a new proposal
2. Add client email (use your own for testing)
3. Click "Send Invitation"
4. **Expected Results**:
   - Email received within 1 minute
   - Status changes to 'sent'
   - Entry appears in `proposal_automation_log`
   - Entry appears in `email_events` (email.sent)

### Test 2: Email Event Tracking

1. Open the email you received
2. Click a link in the email
3. **Expected Results**:
   - Status changes to 'opened' then 'viewed'
   - `engagement_count` increments
   - Entries appear in `email_events` for opened and clicked
   - Events visible in Email Activity Timeline

### Test 3: Automated Follow-ups

**Option A: Manual Trigger**
```bash
curl -X POST \
  https://uyjryuopuqgmsvayiccl.supabase.co/functions/v1/proposal-automation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5anJ5dW9wdXFnbXN2YXlpY2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNzU2MzgsImV4cCI6MjA1OTg1MTYzOH0.M828t6sJxh4lZAVACqpRosoRvW_VibHDAMSXV-3WrLo"
```

**Option B: Modify Dates in Database**
```sql
-- Make a proposal appear 3 days old
UPDATE proposals 
SET last_email_sent_at = NOW() - INTERVAL '3 days'
WHERE id = '[proposal_id]';

-- Then trigger automation manually
```

### Test 4: Pause/Resume Automation

1. Go to proposal details (as agent)
2. Toggle automation off
3. Provide reason
4. Verify `automation_paused = true` in database
5. Trigger automation (proposal should be skipped)
6. Resume automation
7. Verify `automation_paused = false`

### Test 5: Dashboard Metrics

1. Navigate to proposals page (as agent)
2. Click "Show Engagement Dashboard"
3. **Verify**:
   - Metrics display correctly
   - Engagement rate calculated properly
   - Status breakdown shows correct counts

### Test 6: Advanced Filters

1. Apply engagement level filter (e.g., "High")
2. Verify only proposals with 5+ opens display
3. Apply automation status filter ("Paused")
4. Verify only paused proposals display
5. Clear filters
6. Verify all proposals return

---

## 🔍 Monitoring & Debugging

### View Webhook Logs

**Supabase Dashboard:**
[View resend-webhook logs](https://supabase.com/dashboard/project/uyjryuopuqgmsvayiccl/functions/resend-webhook/logs)

**Key Log Messages:**
- `📧 Received Resend webhook: [event_type]`
- `✅ Found proposal: [proposal_id]`
- `📊 Incrementing engagement count`
- `🔄 Updating status: [old] → [new]`

### View Automation Logs

[View proposal-automation logs](https://supabase.com/dashboard/project/uyjryuopuqgmsvayiccl/functions/proposal-automation/logs)

**Key Log Messages:**
- `📋 Found [N] proposals to evaluate`
- `📧 Sending reminder for [proposal_id]`
- `⏰ Marking proposal [id] as stale`
- `✅ AUTOMATION COMPLETE`

### Database Queries

**Check Email Events:**
```sql
SELECT * FROM email_events 
ORDER BY occurred_at DESC 
LIMIT 20;
```

**Check Automation Log:**
```sql
SELECT * FROM proposal_automation_log 
ORDER BY created_at DESC 
LIMIT 20;
```

**Check Proposals with Engagement:**
```sql
SELECT 
  id, 
  title, 
  status, 
  engagement_count, 
  last_engagement_at,
  automation_paused
FROM proposals 
WHERE engagement_count > 0
ORDER BY last_engagement_at DESC;
```

**Check Stale Proposals:**
```sql
SELECT 
  id, 
  title, 
  last_email_sent_at,
  EXTRACT(DAY FROM (NOW() - last_email_sent_at)) as days_inactive
FROM proposals 
WHERE last_email_sent_at < NOW() - INTERVAL '14 days'
  AND status IN ('sent', 'delivered', 'opened');
```

---

## ⚠️ Troubleshooting

### Webhook Not Receiving Events

**Check:**
1. Webhook URL is correct in Resend dashboard
2. Events are selected in Resend webhook config
3. Edge function is deployed (check Supabase dashboard)
4. Review edge function logs for errors

**Test webhook manually:**
```bash
curl -X POST \
  https://uyjryuopuqgmsvayiccl.supabase.co/functions/v1/resend-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email.delivered",
    "created_at": "2025-01-01T00:00:00.000Z",
    "data": {
      "email_id": "test-123",
      "to": ["test@example.com"],
      "subject": "Test Email"
    }
  }'
```

### Automation Not Running

**Check:**
1. Cron job exists: `SELECT * FROM cron.job;`
2. Cron job is active
3. Edge function URL is correct in cron config
4. Review automation logs for errors

### Emails Not Sending

**Check:**
1. `RESEND_API_KEY` is set correctly in Supabase secrets
2. Domain is verified in Resend
3. "From" address uses verified domain
4. Review send-proposal-invitation logs

### Status Not Updating

**Check:**
1. Webhook is receiving events (check logs)
2. `proposal_id` is being found (check logs for "Found proposal")
3. Status transition is valid (check `can_transition_proposal_status`)
4. RLS policies allow updates

---

## 🔒 Security Considerations

1. **Webhook Security**: Consider adding webhook signature verification
2. **RLS Policies**: All tables have proper Row Level Security
3. **API Keys**: Stored securely in Supabase secrets
4. **Email Privacy**: Client emails are not exposed in logs
5. **Rate Limiting**: Resend has built-in rate limits (consider implementing additional limits)

---

## 📈 Performance Optimization

1. **Caching**: Proposal lists are cached for 5 minutes
2. **Batch Processing**: Automation processes all proposals in one run
3. **Indexes**: Key fields are indexed (status, dates, IDs)
4. **Efficient Queries**: Uses RPC functions for complex operations

---

## 🎯 Best Practices

1. **Test in Development First**: Always test with your own email before sending to clients
2. **Monitor Logs**: Check logs daily for the first week after deployment
3. **Review Metrics**: Use engagement dashboard to identify issues
4. **Pause When Needed**: Use automation pause for sensitive proposals
5. **Update Templates**: Regularly review and improve email templates
6. **Clean Up Old Data**: Archive old proposals to maintain performance

---

## 📚 Additional Resources

- [Resend Documentation](https://resend.com/docs)
- [Supabase Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [pg_cron Documentation](https://github.com/citusdata/pg_cron)
- [Proposal CRM API Reference](./API_REFERENCE.md)

---

## 🆘 Support

For issues or questions:
1. Check logs in Supabase dashboard
2. Review this documentation
3. Contact the development team
4. Check GitHub issues (if applicable)

---

**Version:** 1.0  
**Last Updated:** January 2025  
**Maintained by:** Crunch Carbon Development Team
