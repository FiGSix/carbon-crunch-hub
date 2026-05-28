## Plan

The Outlook connector itself appears linked and usable: the connection is present, has `Mail.Read`, `Mail.ReadWrite`, and `Mail.Send`, and a safe read-only mailbox request to the Outlook gateway succeeds.

The failure is coming from the current health-check implementation. It calls the generic connector `verify_credentials` endpoint, which is returning a Microsoft Graph 404: `Invalid version: me`. That makes the UI mark Cora’s mailbox as failed even though the Outlook mailbox can be reached.

## Changes to make

1. **Replace the health-check verifier**
   - Update `supabase/functions/cora-mailbox-health/index.ts` so it no longer relies on `https://connector-gateway.lovable.dev/api/v1/verify_credentials` for Outlook.
   - Instead, verify the mailbox with a real, read-only Outlook Graph gateway request:
     - `https://connector-gateway.lovable.dev/microsoft_outlook/me/messages?$top=1&$select=id,receivedDateTime,from`
   - Treat any successful `2xx` response as `verified`.
   - Keep failures explicit with the returned status/body so the UI still shows useful diagnostics.

2. **Preserve the safety behaviour**
   - Keep `cora_mailbox_status.outcome = failed` when the mailbox cannot be reached.
   - Keep Cora paused automatically when mailbox status is not `verified`.
   - Do not add any Resend fallback or alternate sender.

3. **Leave the send path Outlook-only**
   - Keep `_shared/outlookSend.ts` using the Outlook gateway `/me/sendMail` path.
   - No platform/Resend sending should be introduced for Cora.

4. **Validate after the code change**
   - Deploy/test the updated `cora-mailbox-health` function.
   - Invoke the function and confirm it writes `outcome: verified` to `cora_mailbox_status`.
   - Confirm the admin UI then shows the mailbox as verified after clicking **Re-check**.