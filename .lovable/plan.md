

# Send Missed Weekly Roundup with Apology Note

## What We'll Do

1. Temporarily add a short apology banner to the weekly roundup email template
2. Deploy the updated edge function
3. Manually trigger it to send to all agents and admins
4. Remove the apology banner afterward (so future Friday emails are clean)

## Changes

### File: `supabase/functions/send-weekly-roundup/index.ts`

**Agent email** (`buildAgentEmailHtml`, around line 800): Insert an apology note right after the "Hi {name}" greeting, before the segment opening:

```
Apologies — our weekly roundup didn't go out on Friday as usual due to a technical hiccup on our side. Everything is back on track, and here's your update.
```

**Admin email** (`buildAdminEmailHtml`): Add the same apology note after the admin greeting.

### Deployment and Trigger

- Deploy the updated `send-weekly-roundup` edge function
- Invoke it with no test parameters (production mode) to send to all agents and admins
- After confirming it sent successfully, remove the apology text and redeploy so future Friday emails are clean

## Risk

- Minimal — the apology is a one-line text addition to the existing HTML template
- We remove it immediately after sending, so it won't appear in future automated emails

