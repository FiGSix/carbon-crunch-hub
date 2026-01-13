# Edge Functions Reference

**Last Updated:** January 2026  
**Runtime:** Deno  
**Location:** `supabase/functions/`

---

## Table of Contents

1. [Overview](#overview)
2. [Shared Utilities](#shared-utilities)
3. [Email Functions](#email-functions)
4. [PDF Functions](#pdf-functions)
5. [Proposal Functions](#proposal-functions)
6. [User Management Functions](#user-management-functions)
7. [External API Functions](#external-api-functions)
8. [Webhook Functions](#webhook-functions)
9. [Cron Functions](#cron-functions)
10. [Error Handling](#error-handling)

---

## Overview

Edge Functions are server-side TypeScript functions running on Deno. They handle:
- Email sending via Resend
- PDF generation
- External API calls (Google Maps, Mapbox)
- Webhook processing
- Scheduled tasks

### Base URL

```
https://[project-ref].supabase.co/functions/v1/
```

### Authentication

Most functions require a Supabase JWT token:

```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { ... },
});
```

---

## Shared Utilities

Location: `supabase/functions/_shared/`

### cors.ts

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Usage in function
if (req.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}
```

### supabase.ts

```typescript
import { createClient } from '@supabase/supabase-js';

export function createSupabaseClient(authHeader: string) {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
}

export function createServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}
```

---

## Email Functions

### send-proposal-invitation

Sends initial proposal invitation to client.

**Endpoint:** `POST /send-proposal-invitation`

**Request:**
```typescript
{
  proposalId: string;
  clientEmail: string;
  clientName: string;
  invitationToken: string;
  projectName: string;
  clientId?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  messageId?: string;
  error?: string;
}
```

**Features:**
- CC's the agent
- Includes proposal summary
- Tracks via Resend webhooks

---

### send-auth-email

Custom authentication emails (verification, password reset).

**Endpoint:** `POST /send-auth-email`

**Request:**
```typescript
{
  type: 'signup' | 'recovery' | 'invite';
  email: string;
  data: {
    confirmation_url?: string;
    recovery_url?: string;
    first_name?: string;
  };
}
```

---

### send-agent-invitation

Invites new agents to join.

**Endpoint:** `POST /send-agent-invitation`

**Request:**
```typescript
{
  email: string;
  firstName: string;
  lastName: string;
  companyId?: string;
  companyName?: string;
  invitedBy: string;
}
```

---

### send-client-team-invitation

Invites users to join a client organization.

**Endpoint:** `POST /send-client-team-invitation`

**Request:**
```typescript
{
  email: string;
  firstName: string;
  lastName: string;
  clientCompanyId: string;
  invitedBy: string;
}
```

---

### send-cession-agreement-email

Sends cession agreement for signature.

**Endpoint:** `POST /send-cession-agreement-email`

**Request:**
```typescript
{
  clientId: string;
  clientEmail: string;
  clientName: string;
}
```

---

### send-weekly-roundup

Sends weekly performance reports to agents.

**Endpoint:** `POST /send-weekly-roundup`

**Request:**
```typescript
{
  agentId: string;
  // or
  allAgents: boolean;
}
```

---

## PDF Functions

### generate-proposal-pdf

Generates PDF version of a proposal.

**Endpoint:** `POST /generate-proposal-pdf`

**Request:**
```typescript
{
  proposalId: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  pdfUrl?: string;
  error?: string;
}
```

**Storage:** PDFs stored in `proposal-pdfs` bucket

---

### generate-signed-agreement-pdf

Generates PDF of signed agreement with signature.

**Endpoint:** `POST /generate-signed-agreement-pdf`

**Request:**
```typescript
{
  proposalId: string;
  agreementId: string;
}
```

---

## Proposal Functions

### accept-proposal

Handles proposal signing and post-signature setup.

**Endpoint:** `POST /accept-proposal`

**Request:**
```typescript
{
  proposalId: string;
  signatureType: 'typed' | 'drawn';
  typedName?: string;
  signatureImageUrl?: string;
  ipAddress: string;
  userAgent: string;
  acceptedTermsVersion: string;
  clientEmail: string;
  clientPassword?: string; // For registration
  clientFirstName?: string;
  clientLastName?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  agreementId?: string;
  onboardingId?: string;
  alreadySigned?: boolean;
  autoApproved?: boolean;
  error?: string;
}
```

**Actions:**
1. Creates/links client record
2. Creates proposal_agreement
3. Updates proposal status to 'accepted'
4. Creates project_onboarding record
5. Creates user account (if new)
6. Sends confirmation email

---

### bulk-upload-proposals

Imports proposals from Excel file.

**Endpoint:** `POST /bulk-upload-proposals`

**Request:**
```typescript
{
  proposals: Array<{
    clientEmail: string;
    clientName: string;
    systemSizeKWp: number;
    projectName?: string;
    // ... other fields
  }>;
  agentId: string;
  sendInvitations: boolean;
}
```

---

### bulk-move-to-onboarding

Moves multiple proposals to onboarding status.

**Endpoint:** `POST /bulk-move-to-onboarding`

**Request:**
```typescript
{
  proposalIds: string[];
}
```

---

## User Management Functions

### manage-client-profile

CRUD operations for client records.

**Endpoint:** `POST /manage-client-profile`

**Request:**
```typescript
{
  action: 'create' | 'update' | 'get' | 'delete';
  clientId?: string;
  data?: {
    email: string;
    firstName: string;
    lastName: string;
    companyName?: string;
    phone?: string;
  };
}
```

---

### manage-user-role

Updates user role (admin only).

**Endpoint:** `POST /manage-user-role`

**Request:**
```typescript
{
  userId: string;
  newRole: 'admin' | 'agent' | 'client';
}
```

---

### delete-user

GDPR-compliant user deletion.

**Endpoint:** `POST /delete-user`

**Request:**
```typescript
{
  userId: string;
  reason?: string;
}
```

**Actions:**
1. Soft-deletes profile
2. Anonymizes personal data
3. Maintains audit trail
4. Removes from auth.users

---

## External API Functions

### google-places-autocomplete

Address autocomplete via Google Places API.

**Endpoint:** `POST /google-places-autocomplete`

**Request:**
```typescript
{
  input: string;
  sessionToken?: string;
}
```

**Response:**
```typescript
{
  predictions: Array<{
    place_id: string;
    description: string;
    structured_formatting: {
      main_text: string;
      secondary_text: string;
    };
  }>;
}
```

---

### google-place-details

Get full address details from place ID.

**Endpoint:** `POST /google-place-details`

**Request:**
```typescript
{
  placeId: string;
  sessionToken?: string;
}
```

**Response:**
```typescript
{
  formatted_address: string;
  geometry: {
    location: { lat: number; lng: number };
  };
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}
```

---

### mapbox-geocode

Geocoding fallback via Mapbox.

**Endpoint:** `POST /mapbox-geocode`

**Request:**
```typescript
{
  address: string;
}
```

**Response:**
```typescript
{
  features: Array<{
    center: [number, number]; // [lng, lat]
    place_name: string;
  }>;
}
```

---

## Webhook Functions

### resend-webhook

Processes Resend email events.

**Endpoint:** `POST /resend-webhook`

**Request:** (from Resend)
```typescript
{
  type: 'email.sent' | 'email.delivered' | 'email.opened' | 
        'email.clicked' | 'email.bounced' | 'email.complained';
  created_at: string;
  data: {
    email_id: string;
    to: string[];
    subject: string;
    // ... event-specific data
  };
}
```

**Actions:**
1. Logs event to `email_events` table
2. Updates proposal `last_email_event_type`
3. May trigger status change (delivered → opened → viewed)

---

## Cron Functions

### proposal-automation

Daily automation for proposal follow-ups.

**Schedule:** Daily at 09:00 UTC

**Endpoint:** `POST /proposal-automation`

**Request:**
```typescript
{
  runType?: 'full' | 'follow_ups_only' | 'stale_only';
}
```

**Actions:**
1. Send 3-day follow-up for proposals with no response
2. Send 5-day follow-up for proposals still pending
3. Mark proposals as 'stale' after 14 days
4. Log all actions to `proposal_automation_log`

---

## Error Handling

### Standard Error Response

```typescript
{
  success: false;
  error: string;
  code?: string;
  details?: any;
}
```

### Error Codes

| Code             | Description               |
|------------------|---------------------------|
| `AUTH_REQUIRED`  | No valid auth token        |
| `FORBIDDEN`      | Insufficient permissions   |
| `NOT_FOUND`      | Resource not found         |
| `VALIDATION_ERROR` | Invalid request data     |
| `RATE_LIMITED`   | Too many requests          |
| `EXTERNAL_API_ERROR` | Third-party API failed  |
| `INTERNAL_ERROR` | Server error               |

### Error Logging

```typescript
console.error('[FunctionName] Error:', {
  error: error.message,
  stack: error.stack,
  requestId: req.headers.get('x-request-id'),
});
```

---

## Secrets Management

Required secrets in Supabase Dashboard:

| Secret             | Purpose           |
|--------------------|-------------------|
| `RESEND_API_KEY`   | Email delivery    |
| `GOOGLE_MAPS_API_KEY` | Address services |
| `MAPBOX_ACCESS_TOKEN` | Geocoding fallback |

### Accessing Secrets

```typescript
const apiKey = Deno.env.get('RESEND_API_KEY');
if (!apiKey) {
  throw new Error('RESEND_API_KEY not configured');
}
```

---

## Deployment

### Manual Deploy

```bash
supabase functions deploy function-name
```

### Auto Deploy

Functions are automatically deployed on push to main branch (via Lovable).

### Environment Configuration

Each function can have an `.env` file for local development:

```
# supabase/functions/function-name/.env
RESEND_API_KEY=re_xxx
```

---

## Testing

### Local Testing

```bash
supabase functions serve function-name --env-file .env.local
```

### cURL Testing

```bash
curl -X POST 'http://localhost:54321/functions/v1/function-name' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"key": "value"}'
```

### From Frontend

```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { key: 'value' },
});
```

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Data structure
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues
