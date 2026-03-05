

# Send Audit Ready Confirmation Email to Client

## Overview

When an admin marks a project as "Audit Ready," an email will be sent to the primary client confirming that their project has reached audit readiness and that they will be kept informed of progress through the various milestones until carbon credit issuance.

## Changes

### 1. New Edge Function: `supabase/functions/send-audit-ready-email/index.ts`

- Accepts `{ projectOnboardingId: string }`
- Looks up the `project_onboarding` record, joins to `proposals` and `clients` (via `client_reference_id`) to get:
  - Client name and email
  - Project/proposal title
  - System size
  - Agent details (for CC)
- Sends a branded email via Resend with:
  - Subject: "Your Solar Project is Audit Ready"
  - Body confirming audit readiness, briefly explaining the milestones ahead (Energy Data Analysis, Independent Audit, Verra Audit, Credit Issuance, Sale, Payment)
  - A note that they will receive updates as the project progresses through each stage
- Logs the send to `proposal_automation_log` with the Resend message ID for tracking

### 2. Update `supabase/config.toml`

- Add `[functions.send-audit-ready-email]` with `verify_jwt = false`

### 3. Update `src/pages/ProjectOnboardingDetail/OverviewTab.tsx`

- After successfully setting `audit_ready = true`, invoke the edge function:
  ```typescript
  await supabase.functions.invoke('send-audit-ready-email', {
    body: { projectOnboardingId: project.id }
  });
  ```
- Only trigger the email when toggling audit_ready **on** (not when removing it)
- Show a toast confirming the email was sent (non-blocking; email failure doesn't revert audit status)

## File Summary

| File | Change |
|------|--------|
| `supabase/functions/send-audit-ready-email/index.ts` | New edge function: fetch project/client data, send branded Resend email, log to automation log |
| `supabase/config.toml` | Add function entry with `verify_jwt = false` |
| `src/pages/ProjectOnboardingDetail/OverviewTab.tsx` | Call edge function after marking audit ready |

