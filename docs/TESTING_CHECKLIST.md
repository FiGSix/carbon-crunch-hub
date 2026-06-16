# Proposal CRM System - Testing Checklist

Use this checklist to verify all functionality is working correctly.

---

## ✅ Pre-Deployment Testing

### Environment Setup
- [ ] Resend account created
- [ ] Domain verified in Resend
- [ ] `RESEND_API_KEY` configured in Supabase secrets
- [ ] All database migrations applied
- [ ] All edge functions deployed
- [ ] Cron job scheduled

---

## 📧 Email Integration Tests

### Test 1: Send Proposal Invitation
**Steps:**
1. Create a new proposal with your email as client
2. Click "Send Invitation"
3. Check your email inbox

**Expected Results:**
- [ ] Email received within 1 minute
- [ ] Email has proper branding and styling
- [ ] Proposal link works
- [ ] Agent is CC'd on email
- [ ] Proposal status updates to 'sent'
- [ ] Log entry in `proposal_automation_log` with type 'invitation_sent'
- [ ] Log entry in `email_events` with type 'email.sent'

**SQL Verification:**
```sql
-- Check automation log
SELECT * FROM proposal_automation_log 
WHERE proposal_id = '[your_proposal_id]'
ORDER BY created_at DESC;

-- Check email events
SELECT * FROM email_events 
WHERE proposal_id = '[your_proposal_id]'
ORDER BY occurred_at DESC;

-- Check proposal status
SELECT id, status, last_email_sent_at, invitation_token
FROM proposals 
WHERE id = '[your_proposal_id]';
```

---

### Test 2: Email.Delivered Event
**Steps:**
1. Wait 10-30 seconds after sending invitation
2. Check Supabase edge function logs

**Expected Results:**
- [ ] Webhook received `email.delivered` event
- [ ] Proposal status updates to 'delivered'
- [ ] Entry added to `email_events` table
- [ ] Entry added to `proposal_automation_log`

**Log Messages to Look For:**
```
📧 Received Resend webhook: email.delivered
✅ Found proposal: [proposal_id]
🔄 Updating status: sent → delivered
✅ Webhook processed successfully
```

---

### Test 3: Email.Opened Event
**Steps:**
1. Open the email in your inbox
2. Wait 10-20 seconds
3. Check Supabase logs and database

**Expected Results:**
- [ ] Webhook received `email.opened` event
- [ ] Proposal status updates to 'opened'
- [ ] `engagement_count` increments to 1
- [ ] `last_engagement_at` timestamp set
- [ ] `last_email_event_type` set to 'email.opened'
- [ ] Email Activity Timeline shows "opened" event

**Log Messages:**
```
📧 Received Resend webhook: email.opened
✅ Found proposal: [proposal_id]
📊 Incrementing engagement count
🔄 Updating status: delivered → opened
```

---

### Test 4: Email.Clicked Event
**Steps:**
1. Click the "View Your Proposal" button in email
2. Wait 10-20 seconds
3. Check logs and database

**Expected Results:**
- [ ] Webhook received `email.clicked` event
- [ ] Proposal status updates to 'viewed'
- [ ] `engagement_count` increments to 2
- [ ] `click_url` stored in `email_events`
- [ ] Email Activity Timeline shows "clicked" event

---

## 🤖 Automation Tests

### Test 5: Manual Automation Trigger
**Steps:**
1. Run automation manually:
   ```bash
   curl -X POST \
     https://uyjryuopuqgmsvayiccl.supabase.co/functions/v1/proposal-automation \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5anJ5dW9wdXFnbXN2YXlpY2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNzU2MzgsImV4cCI6MjA1OTg1MTYzOH0.M828t6sJxh4lZAVACqpRosoRvW_VibHDAMSXV-3WrLo" \
     -d '{"time": "manual-test"}'
   ```
2. Check response and logs

**Expected Results:**
- [ ] HTTP 200 response
- [ ] JSON response with summary:
  ```json
  {
    "success": true,
    "reminders_sent": 0,
    "followups_sent": 0,
    "marked_stale": 0,
    "errors": 0,
    "timestamp": "2025-01-01T00:00:00.000Z"
  }
  ```
- [ ] Log shows: `📋 Found [N] proposals to evaluate`

---

### Test 6: 3-Day Reminder (Delivered Not Opened)
**Steps:**
1. Create test proposal, set date to 3 days ago:
   ```sql
   UPDATE proposals 
   SET last_email_sent_at = NOW() - INTERVAL '3 days',
       status = 'delivered',
       automation_paused = false
   WHERE id = '[test_proposal_id]';
   ```
2. Trigger automation manually
3. Check email and logs

**Expected Results:**
- [ ] Reminder email received
- [ ] Subject: "Reminder: Your Carbon Credit Proposal Awaits"
- [ ] Log shows: `📧 Sending reminder for delivered proposal`
- [ ] `last_email_sent_at` updated to current time
- [ ] Entry in `proposal_automation_log` with trigger 'delivered_not_opened_3_days'

---

### Test 7: 2-Day Follow-up (Opened Not Viewed)
**Steps:**
1. Create test proposal:
   ```sql
   UPDATE proposals 
   SET last_email_sent_at = NOW() - INTERVAL '2 days',
       status = 'opened',
       engagement_count = 1,
       last_engagement_at = NOW() - INTERVAL '2 days',
       automation_paused = false
   WHERE id = '[test_proposal_id]';
   ```
2. Trigger automation
3. Check email

**Expected Results:**
- [ ] Follow-up email received
- [ ] Subject: "Still interested in [Project Name]?"
- [ ] Log shows: `📧 Sending follow-up for opened proposal`
- [ ] Entry in automation log with trigger 'opened_not_viewed_2_days'

---

### Test 8: 14-Day Stale Detection
**Steps:**
1. Create test proposal:
   ```sql
   UPDATE proposals 
   SET last_email_sent_at = NOW() - INTERVAL '14 days',
       last_engagement_at = NOW() - INTERVAL '14 days',
       status = 'delivered',
       automation_paused = false
   WHERE id = '[test_proposal_id]';
   ```
2. Trigger automation
3. Check status

**Expected Results:**
- [ ] Proposal status changes to 'stale'
- [ ] Log shows: `⏰ Marking proposal [id] as stale`
- [ ] Entry in automation log with trigger 'auto_stale_after_14_days'
- [ ] No email sent (status update only)

---

### Test 9: Paused Automation
**Steps:**
1. In UI, pause automation for a proposal
2. Provide reason "Testing pause functionality"
3. Set `last_email_sent_at` to 3+ days ago
4. Trigger automation
5. Check that proposal is skipped

**Expected Results:**
- [ ] `automation_paused = true` in database
- [ ] `automation_pause_reason` stored
- [ ] Proposal skipped in automation run
- [ ] Log shows: "Skipping proposal [id] - automation paused"

---

## 🎨 UI/UX Tests

### Test 10: Engagement Dashboard (Agents)
**Steps:**
1. Log in as agent
2. Navigate to proposals page
3. Click "Show Engagement Dashboard"

**Expected Results:**
- [ ] Dashboard displays without errors
- [ ] "Proposals Sent" shows correct count
- [ ] "Engagement Rate" calculates correctly
- [ ] "Avg Time to Open" displays hours/days
- [ ] "Link Clicks" shows correct count
- [ ] Status breakdown bars render correctly

**Manual Calculation:**
```
Engagement Rate = (Opened Proposals / Sent Proposals) × 100
```

---

### Test 11: Advanced Filters (Agents)
**Steps:**
1. Apply "High" engagement filter (5+ opens)
2. Verify only proposals with 5+ engagement_count show
3. Apply "Paused" automation filter
4. Verify only paused proposals show
5. Apply "Clicked" email status filter
6. Clear all filters

**Expected Results:**
- [ ] Each filter works independently
- [ ] Filters combine correctly (AND logic)
- [ ] "No matches" message shows when appropriate
- [ ] Active filter count badge displays
- [ ] Clear all button resets filters

---

### Test 12: Email Activity Timeline
**Steps:**
1. Navigate to proposal details (as agent)
2. Scroll to "Email Activity & Automation" section

**Expected Results:**
- [ ] Timeline displays all email events
- [ ] Events sorted chronologically (newest first)
- [ ] Correct icons for each event type
- [ ] Timestamps formatted correctly
- [ ] Click events show URL
- [ ] Bounce events show reason (if available)

---

### Test 13: Automation Toggle
**Steps:**
1. Toggle automation off
2. Enter reason: "Client requested no follow-ups"
3. Save
4. Toggle automation back on
5. Verify database updates

**Expected Results:**
- [ ] Toggle UI updates immediately
- [ ] Reason dialog appears when pausing
- [ ] Database updates correctly
- [ ] Toast notification appears
- [ ] No reason required when resuming

---

### Test 14: Engagement Badges
**Steps:**
1. View proposal list
2. Find proposals with engagement

**Expected Results:**
- [ ] Eye icon badge appears on engaged proposals
- [ ] Badge shows correct count
- [ ] Badge shows relative time (e.g., "2 hours ago")
- [ ] Badge hidden for proposals with 0 engagement

---

## 🔧 Edge Cases & Error Handling

### Test 15: Duplicate Webhook Events
**Steps:**
1. Send same webhook payload twice rapidly
2. Check database

**Expected Results:**
- [ ] Status only updated once
- [ ] Engagement count accurate (not doubled)
- [ ] No duplicate errors in logs

---

### Test 16: Missing Proposal ID
**Steps:**
1. Send webhook with invalid email/message_id:
   ```bash
   curl -X POST \
     https://uyjryuopuqgmsvayiccl.supabase.co/functions/v1/resend-webhook \
     -H "Content-Type: application/json" \
     -d '{
       "type": "email.delivered",
       "data": {
         "email_id": "nonexistent-id",
         "to": ["nobody@example.com"]
       }
     }'
   ```

**Expected Results:**
- [ ] No errors thrown
- [ ] Log shows: "⚠️ Could not find proposal for email"
- [ ] HTTP 200 response (webhook still processed)
- [ ] Event stored in `email_events` with null proposal_id

---

### Test 17: Invalid Status Transition
**Steps:**
1. Try to update proposal from 'signed' to 'sent' via automation

**Expected Results:**
- [ ] Status update rejected
- [ ] Log shows: "Invalid status transition: signed → sent"
- [ ] Function `can_transition_proposal_status` returns false

---

### Test 18: Resend API Error
**Steps:**
1. Temporarily set invalid API key
2. Try to send proposal invitation
3. Check error handling

**Expected Results:**
- [ ] User sees error message
- [ ] Proposal status does not change
- [ ] Error logged in edge function logs
- [ ] No partial data corruption

---

## 🔒 Security Tests

### Test 19: RLS Policies
**Steps:**
1. Log in as client
2. Try to access email events for other proposals
3. Try to view engagement dashboard

**Expected Results:**
- [ ] Client can only see their own proposals
- [ ] Client cannot see email events table
- [ ] Client cannot see engagement dashboard
- [ ] Client cannot see automation toggle

---

### Test 20: Webhook Authentication
**Steps:**
1. Call webhook without proper payload
2. Call webhook with malformed JSON

**Expected Results:**
- [ ] Invalid requests handled gracefully
- [ ] No database corruption
- [ ] Appropriate HTTP status codes returned

---

## 📊 Performance Tests

### Test 21: Automation Performance
**Steps:**
1. Create 100+ test proposals
2. Trigger automation
3. Monitor execution time

**Expected Results:**
- [ ] Automation completes within 60 seconds
- [ ] No timeouts
- [ ] All proposals processed
- [ ] Memory usage acceptable

---

### Test 22: Dashboard Load Time
**Steps:**
1. Add 500+ proposals to database
2. Open engagement dashboard
3. Measure load time

**Expected Results:**
- [ ] Dashboard loads within 2 seconds
- [ ] No UI freezing
- [ ] Metrics calculated correctly
- [ ] Smooth scrolling

---

## 🎯 Acceptance Criteria

All tests must pass before production deployment:

### Critical (Must Pass)
- [ ] Email invitations send successfully
- [ ] Webhook events tracked correctly
- [ ] Status transitions work properly
- [ ] Automation runs without errors
- [ ] RLS policies protect data

### Important (Should Pass)
- [ ] Dashboard displays metrics accurately
- [ ] Filters work correctly
- [ ] UI is responsive
- [ ] Error messages are clear

### Nice-to-Have (May Pass)
- [ ] Automation completes quickly
- [ ] Advanced filters offer rich options
- [ ] Timeline shows detailed history

---

## 📝 Test Results Log

Use this section to record test results:

| Test # | Test Name | Date | Result | Notes |
|--------|-----------|------|--------|-------|
| 1 | Send Invitation | | ⬜ Pass / ❌ Fail | |
| 2 | Email Delivered | | ⬜ Pass / ❌ Fail | |
| 3 | Email Opened | | ⬜ Pass / ❌ Fail | |
| ... | ... | | | |

---

**Tester Name:** _________________  
**Test Environment:** _________________  
**Date Completed:** _________________  
**Overall Status:** ⬜ PASS / ❌ FAIL
