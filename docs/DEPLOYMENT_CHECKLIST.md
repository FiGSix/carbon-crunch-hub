# Proposal CRM System - Deployment Checklist

Use this checklist before deploying to production.

---

## 📋 Pre-Deployment

### Code Review
- [ ] All code changes reviewed
- [ ] TypeScript errors resolved
- [ ] Build succeeds without warnings
- [ ] No console errors in development
- [ ] Edge functions lint clean

### Testing
- [ ] All manual tests pass (see TESTING_CHECKLIST.md)
- [ ] Webhook integration tested end-to-end
- [ ] Automation tested with real emails
- [ ] UI tested in Chrome, Firefox, Safari
- [ ] Mobile responsiveness verified

### Documentation
- [ ] Setup guide complete (PROPOSAL_CRM_SETUP.md)
- [ ] Testing checklist complete (TESTING_CHECKLIST.md)
- [ ] API reference updated (if applicable)
- [ ] User manual created for agents

---

## 🔧 Configuration

### Resend Setup
- [ ] Production domain added and verified
- [ ] DNS records propagated (SPF, DKIM, DMARC)
- [ ] Production API key generated
- [ ] Production webhook endpoint configured
- [ ] Webhook events selected (sent, delivered, opened, clicked, bounced)
- [ ] Test email sent from production domain

### Supabase Setup
- [ ] All migrations applied to production
- [ ] Edge functions deployed to production
- [ ] `RESEND_API_KEY` secret configured in production
- [ ] Service role key secured
- [ ] Anon key secured
- [ ] RLS policies active and tested
- [ ] Cron job scheduled in production

### Database
- [ ] Backup created before migration
- [ ] All tables have proper indexes
- [ ] RLS policies verified on all tables
- [ ] Database functions tested
- [ ] Triggers verified

---

## 🚀 Deployment Steps

### Step 1: Backup
```bash
# Backup production database
pg_dump -U postgres -h [host] -d postgres > backup_$(date +%Y%m%d).sql
```
- [ ] Backup completed
- [ ] Backup verified (can be restored)
- [ ] Backup stored securely

### Step 2: Deploy Database Changes
```bash
# Apply migrations in order
supabase db push
```
- [ ] Migrations applied successfully
- [ ] No migration errors
- [ ] Schema matches expected state

### Step 3: Deploy Edge Functions
```bash
# Deploy all edge functions
supabase functions deploy resend-webhook
supabase functions deploy proposal-automation
supabase functions deploy send-proposal-invitation
```
- [ ] All functions deployed
- [ ] Function logs accessible
- [ ] Health checks pass

### Step 4: Configure Secrets
```bash
# Set production secrets
supabase secrets set RESEND_API_KEY=[production_key]
```
- [ ] Secrets configured
- [ ] Secrets verified (test edge function call)

### Step 5: Configure Cron Job
```sql
-- Verify cron is scheduled
SELECT * FROM cron.job WHERE jobname = 'proposal-automation-daily';
```
- [ ] Cron job exists
- [ ] Cron schedule correct (9 AM UTC)
- [ ] Cron URL points to production

### Step 6: Deploy Frontend
- [ ] Frontend build succeeds
- [ ] Frontend deployed to hosting
- [ ] Environment variables set correctly
- [ ] Cache cleared

### Step 7: Configure Webhook
- [ ] Production webhook URL added to Resend
- [ ] Webhook endpoint verified (send test event)
- [ ] Webhook logs show successful reception

---

## ✅ Post-Deployment Verification

### Immediate Checks (Within 5 minutes)
- [ ] Website loads without errors
- [ ] Login works
- [ ] Proposals list loads
- [ ] Can create new proposal
- [ ] Can send proposal invitation
- [ ] Email received

### Short-term Checks (Within 1 hour)
- [ ] Webhook events being received
- [ ] Email events tracked in database
- [ ] Engagement counts updating
- [ ] Status transitions working
- [ ] Email activity timeline populating

### Daily Checks (First week)
- [ ] Day 1: Monitor all logs for errors
- [ ] Day 2: Verify automation ran (check cron logs)
- [ ] Day 3: Check reminder emails sent
- [ ] Day 4: Review engagement metrics
- [ ] Day 5: Verify no duplicate events
- [ ] Day 6: Check stale detection working
- [ ] Day 7: Review overall system health

---

## 🔍 Monitoring Setup

### Logging
- [ ] Supabase logs retention configured
- [ ] Edge function logs accessible
- [ ] Error alerting configured
- [ ] Log aggregation tool connected (optional)

### Metrics
- [ ] Engagement rate baseline recorded
- [ ] Email delivery rate tracked
- [ ] Automation success rate monitored
- [ ] Response time benchmarks set

### Alerts
- [ ] Email delivery failures alert
- [ ] Webhook errors alert
- [ ] Automation failures alert
- [ ] High error rate alert
- [ ] API rate limit alerts

---

## 🆘 Rollback Plan

If critical issues arise:

### Immediate Actions
1. Pause automation:
   ```sql
   -- Stop cron job
   SELECT cron.unschedule('proposal-automation-daily');
   ```

2. Disable webhook (in Resend dashboard)

3. Revert database if needed:
   ```bash
   psql -U postgres -h [host] -d postgres < backup_[date].sql
   ```

### Communication
- [ ] Notify team of issues
- [ ] Update status page (if applicable)
- [ ] Prepare user communication
- [ ] Document issues for post-mortem

---

## 📧 Stakeholder Communication

### Before Deployment
- [ ] Notify agents of new features
- [ ] Schedule training session
- [ ] Provide user documentation
- [ ] Set expectations for metrics

### After Deployment
- [ ] Announce successful launch
- [ ] Share engagement dashboard access
- [ ] Provide support contact
- [ ] Collect initial feedback

---

## 🎓 Training

### Agent Training
- [ ] How to view engagement metrics
- [ ] How to use advanced filters
- [ ] How to pause/resume automation
- [ ] How to interpret email activity timeline
- [ ] Best practices for email engagement

### Admin Training
- [ ] How to monitor webhook logs
- [ ] How to manually trigger automation
- [ ] How to troubleshoot common issues
- [ ] How to manage secrets
- [ ] How to review system metrics

---

## 📚 Documentation Handoff

### Technical Docs
- [ ] Architecture diagram created
- [ ] API documentation complete
- [ ] Database schema documented
- [ ] Edge function specs documented
- [ ] Troubleshooting guide finalized

### User Docs
- [ ] Agent user guide created
- [ ] FAQ document prepared
- [ ] Video tutorials recorded (optional)
- [ ] Quick reference card created

---

## 🔒 Security Checklist

### Access Control
- [ ] RLS policies reviewed and tested
- [ ] Service role key rotated
- [ ] Anon key secured (not exposed in logs)
- [ ] Webhook endpoint doesn't expose sensitive data
- [ ] Admin access restricted

### Data Protection
- [ ] PII handled according to regulations
- [ ] Email addresses not logged in plain text
- [ ] Encryption at rest verified
- [ ] Encryption in transit verified
- [ ] Data retention policy defined

### Compliance
- [ ] GDPR compliance reviewed (if applicable)
- [ ] Email consent tracking implemented
- [ ] Unsubscribe mechanism available
- [ ] Privacy policy updated
- [ ] Terms of service updated

---

## 📊 Success Metrics

### Week 1 Targets
- [ ] 90%+ email delivery rate
- [ ] 0 critical errors
- [ ] >50% engagement rate
- [ ] <5% bounce rate
- [ ] 100% webhook events captured

### Month 1 Targets
- [ ] Automation reduces manual follow-ups by 80%
- [ ] Average response time < 24 hours
- [ ] 95%+ uptime
- [ ] Positive user feedback (>4/5 rating)

---

## 🎯 Go/No-Go Decision

**Deployment is GO if:**
- ✅ All critical tests pass
- ✅ All stakeholders approve
- ✅ Rollback plan documented
- ✅ Monitoring configured
- ✅ Support team trained

**Deployment is NO-GO if:**
- ❌ Critical bugs unresolved
- ❌ Security concerns exist
- ❌ Rollback plan incomplete
- ❌ Key stakeholders unavailable

---

## 📝 Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Technical Lead | | | |
| Product Owner | | | |
| QA Lead | | | |
| Security Officer | | | |
| Operations Lead | | | |

---

## 🎉 Post-Deployment

### Immediate (Day 1)
- [ ] Monitor logs continuously
- [ ] Be available for hot fixes
- [ ] Address user questions
- [ ] Document any issues

### Short-term (Week 1)
- [ ] Daily health checks
- [ ] Gather user feedback
- [ ] Optimize based on metrics
- [ ] Plan improvements

### Long-term (Month 1+)
- [ ] Review engagement trends
- [ ] Identify optimization opportunities
- [ ] Plan feature enhancements
- [ ] Conduct retrospective

---

**Deployment Manager:** _________________  
**Deployment Date:** _________________  
**Deployment Time:** _________________  
**Status:** ⬜ GO / ❌ NO-GO / ✅ COMPLETE
