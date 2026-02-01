
# Partner Invitation & Management System

## Overview

This plan implements a comprehensive Partner Invitation & Management System that allows admins to invite external integration partners, generate API credentials, send onboarding emails, and manage partner access. The system will follow existing patterns from the Agent Invitation system while adapting them for the Partner API use case.

## Current State Analysis

### Existing Infrastructure
- **Database**: `partners` and `partner_api_keys` tables are already in place with RLS policies
- **Partner API**: Fully operational at `partner-api` edge function with authentication, rate limiting, and all CRUD operations
- **Email Pattern**: `send-agent-invitation` edge function provides a reusable template for invitation emails via Resend
- **UI Pattern**: `AgentInvitationDialog` and `InvitedAgentsTable` demonstrate the invitation workflow pattern

### Gap Analysis
- No `partner_invitations` table to track pending invitations
- No UI for creating/managing partners or API keys
- No edge function to send partner onboarding emails
- No way for admins to generate and share API credentials securely

---

## Architecture

### Database Layer

A new `partner_invitations` table will track pending partner invitations:

```text
partner_invitations
+-------------------+-------------------------+-------------------------------------+
| Column            | Type                    | Description                         |
+-------------------+-------------------------+-------------------------------------+
| id                | uuid (PK)               | Unique identifier                   |
| email             | text                    | Partner contact email               |
| company_name      | text                    | Partner company name                |
| contact_name      | text (nullable)         | Contact person name                 |
| invitation_token  | text                    | Secure token for tracking           |
| status            | text                    | pending / accepted / expired        |
| requested_scopes  | jsonb                   | Requested API scopes                |
| environment       | text                    | test / live                         |
| notes             | text (nullable)         | Admin notes                         |
| invited_by        | uuid (FK profiles)      | Admin who sent invitation           |
| accepted_at       | timestamptz (nullable)  | When partner completed registration |
| expires_at        | timestamptz             | Token expiration (7 days)           |
| partner_id        | uuid (nullable)         | Links to created partner record     |
| created_at        | timestamptz             | Record creation timestamp           |
+-------------------+-------------------------+-------------------------------------+
```

### File Structure

```text
src/pages/admin/
  PartnerManagement.tsx                    # Main page with tabs

src/components/admin/partners/
  PartnerInvitationDialog.tsx              # Invite new partner form
  PendingPartnersTable.tsx                 # Pending invitations list
  ActivePartnersTable.tsx                  # Active partners with API keys
  PartnerDetailsDialog.tsx                 # View/edit partner details
  ApiKeyRevealDialog.tsx                   # Secure API key reveal (one-time)
  PartnerScopeSelector.tsx                 # Multi-select scope picker
  PartnerUsageStats.tsx                    # API usage metrics

supabase/functions/
  send-partner-invitation/index.ts         # Edge function for invitation emails
```

---

## Implementation Details

### Step 1: Database Migration

Create `partner_invitations` table with RLS policies:

```sql
CREATE TABLE public.partner_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  company_name text NOT NULL,
  contact_name text,
  invitation_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  requested_scopes jsonb DEFAULT '[]'::jsonb,
  environment text NOT NULL DEFAULT 'test',
  notes text,
  invited_by uuid REFERENCES public.profiles(id),
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL,
  partner_id uuid REFERENCES public.partners(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.partner_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage partner invitations"
  ON public.partner_invitations FOR ALL
  USING (is_current_user_admin());
```

### Step 2: Edge Function - send-partner-invitation

Create edge function that:
1. Validates admin authentication
2. Creates or updates invitation record
3. Generates secure API key (for test environment)
4. Stores hashed key in database
5. Sends branded onboarding email with:
   - API documentation links
   - Test API key (visible once only)
   - Getting started instructions
   - Rate limits and scope information

Email template will include:
- Partner API documentation link
- SDK examples endpoint
- Test API key (masked after initial delivery)
- 7-day expiration notice
- Contact information for support

### Step 3: Partner Management Page

#### Route Configuration

Add to `App.tsx`:
```typescript
const PartnerManagement = createOptimizedLazyComponent(
  () => import("./pages/admin/PartnerManagement"), 
  "PartnerManagement"
);

// Route: /admin/partners with admin-only access
```

#### Sidebar Entry

Add to `DashboardSidebar.tsx`:
```typescript
{
  name: "Partner API",
  href: "/admin/partners",
  icon: Code2,  // from lucide-react
  roles: ["admin"]
}
```

#### Page Layout

```text
+--------------------------------------------------+
| DashboardHeader: Partner API Management          |
| "Invite and manage third-party API integrations" |
+--------------------------------------------------+
| [+ Invite Partner]                   [API Docs]  |
+--------------------------------------------------+
| Tabs: [Pending] [Active] [Usage Stats]           |
+--------------------------------------------------+
|                                                  |
|   Tab Content Area                               |
|   - Pending: Invitation table with resend/cancel |
|   - Active: Partners table with key management   |
|   - Usage: API request charts and metrics        |
|                                                  |
+--------------------------------------------------+
```

### Step 4: Component Implementation

#### PartnerInvitationDialog.tsx

Form fields:
- Company Name (required)
- Contact Email (required)
- Contact Name (optional)
- Environment: Test / Live radio buttons
- API Scopes: Multi-select checkboxes for available scopes
- Notes: Optional admin notes

Submit action:
1. Invoke `send-partner-invitation` edge function
2. Display success with generated API key (one-time view)
3. Refresh pending invitations table

#### PendingPartnersTable.tsx

Columns:
- Company Name
- Contact Email
- Environment (badge)
- Scopes (comma-separated)
- Invited (relative time)
- Expires (relative time with warning if <24h)
- Actions: Resend, Cancel, Create Partner

Actions:
- **Resend**: Re-send invitation email with fresh token
- **Cancel**: Delete invitation record
- **Create Partner**: Manually create partner + API key (skip email)

#### ActivePartnersTable.tsx

Columns:
- Partner Name
- Contact Email
- API Key Prefix (e.g., `cc_test_part`)
- Environment
- Scopes (expandable)
- Last Used (relative time)
- Request Count
- Status (active/inactive badge)
- Actions

Actions:
- **View Details**: Open PartnerDetailsDialog
- **Regenerate Key**: Generate new API key (revokes old)
- **Toggle Status**: Activate/deactivate partner
- **View Usage**: Jump to usage stats for this partner

#### ApiKeyRevealDialog.tsx

Secure one-time API key display:
- Warning message about key visibility
- Copy-to-clipboard button
- Confirmation checkbox before reveal
- Auto-close after 60 seconds
- Cannot re-open after close

### Step 5: API Key Generation Logic

Server-side key generation in edge function:

```typescript
// Generate secure API key
const keyPrefix = environment === 'live' ? 'cc_live_' : 'cc_test_';
const keyBody = crypto.randomUUID().replace(/-/g, '') + 
                crypto.randomUUID().replace(/-/g, '').substring(0, 16);
const apiKey = keyPrefix + keyBody;

// Hash for storage
const encoder = new TextEncoder();
const keyData = encoder.encode(apiKey);
const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
const hashArray = Array.from(new Uint8Array(hashBuffer));
const apiKeyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

// Store only hash + prefix
await supabase.from('partner_api_keys').insert({
  partner_id: partnerId,
  api_key_prefix: apiKey.substring(0, 12),
  api_key_hash: apiKeyHash,
  environment,
  scopes: requestedScopes,
  is_active: true
});

// Return plain key to admin (one-time only)
return { apiKey, prefix: apiKey.substring(0, 12) };
```

---

## Invitation Flow

```text
1. Admin opens Partner Invitation Dialog
2. Admin fills company details and selects scopes
3. System generates:
   - Secure invitation token
   - API key (hashed for storage)
4. Edge function sends onboarding email with:
   - Plain API key (one-time view in email)
   - Documentation links
   - Getting started guide
5. Invitation record created with status: "pending"
6. Partner receives email and starts integration
7. Partner's first API call marks invitation as "accepted"
8. Admin can view partner activity in Usage Stats tab
```

---

## Email Template Content

Subject: **Welcome to Crunch Carbon Partner API**

Content sections:
1. Welcome message with company name
2. API credentials box (API key visible)
3. Quick start code example (cURL)
4. Documentation links:
   - OpenAPI Spec: `/v1/openapi.json`
   - SDK Examples: `/v1/sdk-examples`
   - Health Check: `/v1/health`
5. Rate limits and scopes granted
6. Support contact information
7. Key expiration notice (if test environment)

---

## Security Considerations

1. **API Key Handling**
   - Keys are generated server-side only
   - Plain keys visible once (in email and one-time dialog)
   - Only hashed keys stored in database
   - Key prefix visible for identification

2. **Invitation Security**
   - Tokens expire after 7 days
   - Admin-only access to invitation management
   - All actions logged in partner_api_logs

3. **RLS Protection**
   - All tables protected by admin-only RLS policies
   - Edge function validates admin role via JWT

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/admin/PartnerManagement.tsx` | Main page with tabs |
| `src/components/admin/partners/PartnerInvitationDialog.tsx` | Invitation form dialog |
| `src/components/admin/partners/PendingPartnersTable.tsx` | Pending invitations table |
| `src/components/admin/partners/ActivePartnersTable.tsx` | Active partners table |
| `src/components/admin/partners/PartnerDetailsDialog.tsx` | View/edit partner details |
| `src/components/admin/partners/ApiKeyRevealDialog.tsx` | One-time key reveal |
| `src/components/admin/partners/PartnerScopeSelector.tsx` | Scope multi-select |
| `supabase/functions/send-partner-invitation/index.ts` | Invitation edge function |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add lazy route for `/admin/partners` |
| `src/components/layout/DashboardSidebar.tsx` | Add "Partner API" nav item |
| `supabase/config.toml` | Add `send-partner-invitation` function config |

## Database Changes

| Change | Type |
|--------|------|
| Create `partner_invitations` table | Migration |
| Add RLS policies for partner_invitations | Migration |

---

## Estimated Implementation

- **Database migration**: 1 SQL migration file
- **Edge function**: 1 new function (~300 lines)
- **React components**: 7 new components
- **Route/sidebar updates**: 2 file modifications
- **Total new files**: 9 files
