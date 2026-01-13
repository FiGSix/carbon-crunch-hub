# Troubleshooting Guide

**Last Updated:** January 2026

---

## Table of Contents

1. [Authentication Issues](#authentication-issues)
2. [Registration Issues](#registration-issues)
3. [Proposal Issues](#proposal-issues)
4. [Email Issues](#email-issues)
5. [Database Issues](#database-issues)
6. [Edge Function Issues](#edge-function-issues)
7. [Performance Issues](#performance-issues)
8. [Common Error Messages](#common-error-messages)

---

## Authentication Issues

### "Invalid login credentials"

**Symptoms:**
- User cannot log in
- Error message: "Invalid login credentials"

**Possible Causes:**
1. Wrong email or password
2. User hasn't verified email
3. Account was deleted/disabled

**Solutions:**
1. Verify email address is correct
2. Check Supabase Auth logs for verification status
3. Use "Forgot Password" to reset
4. Check `profiles.deleted_at` is NULL

```sql
-- Check if user exists and is verified
SELECT 
  id, 
  email, 
  email_confirmed_at,
  created_at
FROM auth.users 
WHERE email = 'user@example.com';
```

---

### "Session expired" or auto-logout

**Symptoms:**
- User gets logged out unexpectedly
- Actions fail with auth errors

**Possible Causes:**
1. JWT token expired (1 hour lifetime)
2. Refresh token failed
3. Browser cleared cookies

**Solutions:**
1. Check if refresh token is still valid (7 days)
2. Clear browser data and log in again
3. Check for network issues during token refresh

---

### Profile not loading after login

**Symptoms:**
- User logs in but sees loading spinner
- Profile data is null

**Possible Causes:**
1. `handle_new_user()` trigger failed
2. RLS policy blocking access
3. Profile doesn't exist

**Solutions:**
```sql
-- Check if profile exists
SELECT * FROM profiles WHERE id = 'user-uuid';

-- If missing, create manually (emergency fix)
INSERT INTO profiles (id, email, role, created_at)
SELECT id, email, 'client', NOW()
FROM auth.users
WHERE id = 'user-uuid'
AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = 'user-uuid');
```

---

## Registration Issues

### "Duplicate key value violates unique constraint"

**Symptoms:**
- Registration fails
- Error mentions `clients_email_key` or similar

**Cause:**
Client record already exists with that email (created by agent during proposal).

**Solution (Applied Jan 2026):**
The `sync_client_record_on_team_join()` function was updated to:
1. Check for existing client by `user_id` first
2. Check for existing client by `email` 
3. Update existing record instead of inserting

```sql
-- Verify the fix is deployed
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'sync_client_record_on_team_join';
```

---

### Agent stuck on "Pending Approval"

**Symptoms:**
- Agent can log in but sees pending page
- Cannot access dashboard

**Cause:**
`agent_status` is `pending_approval`

**Solutions:**

1. **Admin approval (normal flow):**
   - Admin goes to Agent Management
   - Clicks "Approve" on the agent

2. **Direct database update (emergency):**
```sql
UPDATE profiles 
SET agent_status = 'approved',
    status_changed_at = NOW()
WHERE id = 'agent-uuid' 
AND role = 'agent';
```

---

### Email verification link not working

**Symptoms:**
- User clicks verification link
- Gets error or redirect fails

**Possible Causes:**
1. Link expired (24 hours)
2. Link already used
3. Incorrect redirect URL

**Solutions:**
1. Resend verification email from Supabase Dashboard
2. Check email template redirect URLs
3. Manually verify:
```sql
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'user@example.com';
```

---

## Proposal Issues

### Proposal not visible to client

**Symptoms:**
- Agent created proposal
- Client cannot see it

**Possible Causes:**
1. `client_id` or `client_reference_id` not set correctly
2. RLS policy blocking access
3. Proposal status is `draft`

**Solutions:**
```sql
-- Check proposal assignment
SELECT 
  id, 
  title,
  status,
  client_id,
  client_reference_id,
  agent_id
FROM proposals 
WHERE id = 'proposal-uuid';

-- Check client record linking
SELECT 
  c.id,
  c.email,
  c.user_id
FROM clients c
JOIN proposals p ON p.client_reference_id = c.id
WHERE p.id = 'proposal-uuid';
```

---

### Proposal signature not saving

**Symptoms:**
- Client signs but gets error
- Agreement not created

**Possible Causes:**
1. Edge Function timeout
2. Storage upload failed
3. Database constraint violation

**Solutions:**
1. Check Edge Function logs:
   ```
   Supabase Dashboard → Edge Functions → accept-proposal → Logs
   ```

2. Check for existing agreement:
```sql
SELECT * FROM proposal_agreements 
WHERE proposal_id = 'proposal-uuid';
```

3. Check proposal status:
```sql
-- If already accepted, return success
SELECT status, signed_at FROM proposals 
WHERE id = 'proposal-uuid';
```

---

### Carbon calculations showing wrong values

**Symptoms:**
- Revenue figures don't match expected
- Percentages seem wrong

**Possible Causes:**
1. Portfolio size not updated
2. Override percentages applied
3. Wrong unit (kWp vs MWp)

**Debug Steps:**
```typescript
// Check calculation inputs
console.log({
  systemSizeKWp: proposal.system_size_kwp,
  clientPortfolio: await getClientPortfolioSize(clientId),
  clientShareOverride: client.portfolio_client_share_override,
  agentCommissionOverride: agent.commission_override,
});
```

---

## Email Issues

### Emails not being sent

**Symptoms:**
- No invitation emails received
- Edge Function appears to succeed

**Possible Causes:**
1. `RESEND_API_KEY` not set
2. Resend account suspended
3. Rate limiting

**Solutions:**
1. Check secret is configured:
   ```
   Supabase Dashboard → Settings → Secrets
   ```

2. Check Resend dashboard for delivery status

3. Check Edge Function logs for API errors

---

### Emails going to spam

**Symptoms:**
- Emails delivered but in spam folder

**Solutions:**
1. Verify sending domain in Resend
2. Add SPF/DKIM records
3. Check email content for spam triggers

---

### Email tracking not working

**Symptoms:**
- Opens/clicks not being recorded
- Proposal status not updating

**Possible Causes:**
1. Webhook not configured
2. Webhook URL incorrect
3. Webhook secret mismatch

**Solutions:**
1. Check Resend webhook configuration
2. Verify webhook URL: `https://[project].supabase.co/functions/v1/resend-webhook`
3. Check `email_events` table for entries

```sql
SELECT * FROM email_events 
WHERE proposal_id = 'proposal-uuid'
ORDER BY occurred_at DESC;
```

---

## Database Issues

### RLS policy blocking query

**Symptoms:**
- Query returns empty when data exists
- No error, just no results

**Debug:**
```sql
-- Temporarily bypass RLS (admin only)
SET LOCAL role TO postgres;
SELECT * FROM table_name WHERE id = 'uuid';
RESET role;

-- Check user's role
SELECT role FROM profiles WHERE id = auth.uid();

-- Check specific policy
SELECT * FROM pg_policies WHERE tablename = 'table_name';
```

---

### Trigger function failed

**Symptoms:**
- Insert succeeds but side effects missing
- Errors in Supabase logs

**Debug:**
1. Check Database → Logs in Supabase Dashboard
2. Look for trigger name in error

```sql
-- List triggers on a table
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'table_name';
```

---

### Migration failed

**Symptoms:**
- Migration shows failed in dashboard
- Schema changes not applied

**Solutions:**
1. Check migration SQL for syntax errors
2. Look at database logs for specific error
3. May need to manually fix and re-run

---

## Edge Function Issues

### Function timeout

**Symptoms:**
- Request hangs then fails
- Error: "Function execution exceeded time limit"

**Causes:**
1. External API taking too long
2. Database query too slow
3. Processing too much data

**Solutions:**
1. Add timeout to external calls
2. Optimize database queries
3. Paginate large operations

```typescript
// Add timeout to fetch
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);

try {
  const response = await fetch(url, { signal: controller.signal });
} finally {
  clearTimeout(timeoutId);
}
```

---

### CORS errors

**Symptoms:**
- Browser console shows CORS error
- Function works from curl but not browser

**Solutions:**
1. Ensure CORS headers are included:
```typescript
import { corsHeaders } from '../_shared/cors.ts';

// Handle preflight
if (req.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}

// Include in response
return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
```

---

### "Secret not found" error

**Symptoms:**
- Edge Function fails immediately
- Error: "Environment variable not set"

**Solutions:**
1. Add secret in Supabase Dashboard:
   ```
   Settings → Secrets → Add new
   ```

2. Redeploy function after adding secret

3. Verify secret name matches code:
```typescript
const key = Deno.env.get('RESEND_API_KEY');
if (!key) throw new Error('RESEND_API_KEY not configured');
```

---

## Performance Issues

### Slow page load

**Symptoms:**
- Dashboard takes > 3 seconds
- Multiple loading spinners

**Possible Causes:**
1. Too many sequential queries
2. No caching
3. Large data sets without pagination

**Solutions:**
1. Use React Query for caching
2. Implement pagination
3. Parallelize queries
4. Check for N+1 query patterns

---

### Cache not updating

**Symptoms:**
- Data changes not reflected immediately
- Need to refresh page

**Solutions:**
```typescript
// Invalidate specific cache
queryClient.invalidateQueries({ queryKey: ['proposals'] });

// Or clear all cache
CacheManager.clearCachePattern('proposals');
```

---

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "JWT expired" | Token needs refresh | Re-authenticate |
| "Row level security" | RLS policy blocking | Check user permissions |
| "duplicate key value" | Unique constraint | Check for existing record |
| "foreign key violation" | Referenced record missing | Create parent record first |
| "permission denied" | Insufficient DB permissions | Check RLS policies |
| "function not found" | Edge Function not deployed | Deploy function |
| "rate limit exceeded" | Too many requests | Wait and retry |

---

## Debugging Checklist

When troubleshooting any issue:

1. **Check browser console** - JavaScript errors, network failures
2. **Check network tab** - API response status and body
3. **Check Supabase logs**:
   - Database → Logs
   - Edge Functions → Logs
   - Auth → Logs
4. **Check Sentry** - Production errors with stack traces
5. **Query database directly** - Verify data state
6. **Check RLS** - Temporarily bypass to isolate
7. **Check Edge Function logs** - Look for the specific function
8. **Verify secrets** - Ensure all required secrets are set

---

## Getting Help

1. **Supabase Discord** - Community support
2. **Supabase Documentation** - https://supabase.com/docs
3. **Lovable Documentation** - https://docs.lovable.dev
4. **GitHub Issues** - For bugs in dependencies

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Data structure
- [AUTH_FLOW.md](./AUTH_FLOW.md) - Authentication
- [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) - API reference
