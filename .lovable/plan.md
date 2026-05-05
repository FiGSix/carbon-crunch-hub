# Provision Partner Access for data@keios.tech

## Goal
Create a live-environment partner account for `data@keios.tech` with all 7 API scopes and deliver the API key.

## Scopes (all 7)
- `proposals:create`
- `proposals:read`
- `proposals:acceptance`
- `projects:onboarding:read`
- `projects:onboarding:write`
- `projects:documents:write`
- `projects:data-access:write`

## Approach
Reuse the existing `send-partner-invitation` edge function (already deployed, used by the Admin → Partners UI). It generates an API key, hashes it (SHA-256), creates the `partners` + `partner_api_keys` rows, and emails the partner with the one-time key.

Two execution options — recommend **Option A** (no code, audit-trailed via UI):

### Option A — Use the existing Admin UI (recommended)
1. Navigate to `/admin/partners`
2. Click **Invite Partner**
3. Fill in:
   - Email: `data@keios.tech`
   - Company Name: *(confirm — defaulting to "Keios")*
   - Environment: **Live**
   - Scopes: tick all 7
4. Submit → copy the revealed key (shown once) and confirm the partner received the email.

### Option B — Provision via script (if you prefer I do it directly)
Invoke `send-partner-invitation` from an authenticated admin session with the same payload above. Result: same row inserts + email + one-time key returned in the response, which I'd surface back to you in chat (then it's gone).

## Open Questions
- **Company Name** for the partner record? (e.g. "Keios", "Keios Tech")
- **Contact Name** (optional)?
- Any internal notes to attach?

Once you confirm the company name and pick Option A or B, I'll proceed.
