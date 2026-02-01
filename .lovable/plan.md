

# Crunch Carbon Partner API v3 - Final Build Plan

## Executive Summary

Build a production-grade RESTful Partner API that enables third-party platforms (monitoring apps, installer software, OEM manufacturer apps) to seamlessly integrate with Crunch Carbon's carbon credit infrastructure. The API supports the complete 4-step journey from proposal creation through data access configuration.

**Key architectural decisions:**
- Proposal → Project model separation after signature
- PATCH semantics with optimistic concurrency (ETag) for incremental onboarding
- Pre-signed URLs for secure document uploads
- Explicit consent tracking for POPIA compliance
- All signatures occur on Crunch Carbon platform (no API-based signing)
- Webhook verification handshake + encrypted secrets (not hashed)
- Granular scope-based authorization
- Energy data ingestion deferred to Phase 2

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         PARTNER APPLICATIONS                             │
│       Monitoring Apps    │    Installer Platforms    │    OEM Apps      │
└──────────┬──────────────────────────┬─────────────────────┬─────────────┘
           │                          │                     │
           ▼                          ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    CRUNCH CARBON PARTNER API v1                         │
│  ┌──────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐ │
│  │ Partner  │  │ Proposals  │  │ Projects   │  │ Webhooks + Events    │ │
│  │ Auth     │  │ (Stage 1-2)│  │ (Stage 3-4)│  │                      │ │
│  └──────────┘  └────────────┘  └────────────┘  └──────────────────────┘ │
│                                                                         │
│  Key: Proposals = commercial wrapper (pre-signature)                    │
│       Projects  = long-lived asset (post-signature)                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Model: Partners, Proposals, and Projects

### Revised Entity Structure

```text
┌──────────────┐
│   partners   │ ◄── One partner org, multiple API keys
└──────┬───────┘
       │
       ├──────────────────┐
       ▼                  ▼
┌──────────────┐   ┌─────────────────────────┐
│partner_api_  │   │partner_webhook_         │
│keys          │   │subscriptions            │
└──────────────┘   └─────────────────────────┘
       │
       ▼
┌──────────────┐         ┌──────────────┐
│  proposals   │────────►│   projects   │
│(commercial)  │ signed  │(long-lived)  │
└──────────────┘         └──────────────┘
```

### API Design Decision
| Stage | Primary Object | Rationale |
|-------|----------------|-----------|
| 1. Create Proposal | `proposal_id` | Commercial wrapper, can expire/resend |
| 2. Sign Agreement | `proposal_id` → returns `project_id` | Creates long-lived project record |
| 3. Onboarding | `project_id` | Project is permanent asset |
| 4. Data Access | `project_id` | Data tied to physical installation |

---

## Authorization: Scopes

### Scope Matrix
| Scope | Endpoints Allowed |
|-------|-------------------|
| `proposals:create` | `POST /v1/proposals` |
| `proposals:read` | `GET /v1/proposals`, `GET /v1/proposals/{id}` |
| `proposals:send` | `POST /v1/proposals/{id}/send-acceptance-link` |
| `projects:read` | `GET /v1/projects`, `GET /v1/projects/{id}` |
| `projects:onboarding:write` | `PATCH /v1/projects/{id}/onboarding`, `POST .../submit` |
| `projects:documents:write` | `POST .../documents/presign`, `POST .../confirm` |
| `projects:data_access:write` | `POST /v1/projects/{id}/data-access` |
| `webhooks:manage` | `POST/GET/DELETE /v1/webhooks/*` |
| `clients:read` | `GET /v1/clients/{email}/proposals`, `GET /v1/clients/{email}/projects` |

### Default Scopes (new partners)
```json
["proposals:create", "proposals:read", "proposals:send", "projects:read", "projects:onboarding:write"]
```

---

## API Endpoints - Complete Specification

### Authentication Header
```text
Authorization: Bearer cc_live_xxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json
X-Idempotency-Key: unique-request-id (recommended for POSTs)
```

---

### Stage 1: Create Proposal

**Endpoint:** `POST /v1/proposals`
**Required Scope:** `proposals:create`

#### Request Schema
```typescript
{
  // Partner's internal reference - UNIQUE per partner
  partner_reference_id?: string;  // e.g. "installer-job-12345"
  
  // Client Information (required)
  client: {
    first_name: string;           // Required
    last_name: string;            // Required
    email: string;                // Required, validated format
    phone?: string;               // Optional, E.164 format preferred
    company_name?: string;        // Optional
  };
  
  // Project/Site Information (required)
  project: {
    name?: string;                // Optional project name
    address: string;              // Required - full street address
    country: "ZA";                // Required - must be "ZA" for v1
    gps_lat?: number;             // Optional, -90 to 90
    gps_lng?: number;             // Optional, -180 to 180
    system_size_kwp: number;      // Required, 0.1 to 15000
    commissioning_date: string;   // Required, YYYY-MM-DD, must be 2022+
    installer_company?: string;   // Optional
    installer_email?: string;     // Optional, validated format
  };
  
  // Consent (POPIA compliance - required)
  consent: {
    obtained: true;               // Required, must be true
    source: string;               // Required: "app_signup" | "installer_registration" | "oem_activation"
    timestamp?: string;           // Optional, ISO8601
  };
  
  // Email control
  send_email?: boolean;           // Default: true - send proposal email
}
```

#### Response Schema
```typescript
{
  success: true;
  proposal_id: string;            // UUID
  client_id: string;              // UUID (for reference)
  partner_reference_id?: string;  // Echoed back
  
  // Estimates (for display in partner app)
  estimates: {
    credits_per_year: number;     // e.g. 45
    revenue_6yr_total: number;    // e.g. 40125 (ZAR)
    client_share_percentage: number; // e.g. 60.2
  };
  
  // For client action
  acceptance_url: string;         // https://crunchcarbon.com/accept/TOKEN
  expires_at: string;             // ISO8601, 10 days default
  
  // Email status
  email_sent: boolean;
  email_queued_at?: string;
}
```

#### Duplicate Detection Logic

**Hard Unique Constraint:**
- `(partner_id, partner_reference_id)` - one partner cannot reuse reference IDs

**Fuzzy Match Detection:**
- `(client.email, project.address, commissioning_date)` - returns 409 with matches

```typescript
// 409 Response for fuzzy match
{
  success: false;
  error: {
    code: "DUPLICATE_PROPOSAL",
    message: "Possible duplicate proposal found"
  },
  matches: [
    {
      proposal_id: "uuid",
      status: "sent",
      created_at: "2025-01-15T10:00:00Z",
      partner_reference_id: "job-123"
    }
  ]
}
```

#### Validation Rules
| Field | Rule | Error Code |
|-------|------|------------|
| `project.country` | Must be "ZA" | `INVALID_COUNTRY` |
| `project.system_size_kwp` | 0.1 - 15000 | `SYSTEM_SIZE_OUT_OF_RANGE` |
| `project.commissioning_date` | >= 2022-01-01 | `COMMISSIONING_TOO_EARLY` |
| `consent.obtained` | Must be `true` | `CONSENT_REQUIRED` |
| `client.email` | Valid email format | `INVALID_EMAIL` |
| `partner_reference_id` | Unique per partner | `DUPLICATE_REFERENCE_ID` |

---

### Stage 2: Send Acceptance Link

**Endpoint:** `POST /v1/proposals/{proposal_id}/send-acceptance-link`
**Required Scope:** `proposals:send`

All signatures occur on the Crunch Carbon platform to ensure:
- Full audit trail with document hash
- Correct terms display and version tracking
- No dispute risk about what was signed
- Consistent user experience

```typescript
// Request
{
  redirect_url?: string;        // Where to redirect after signing
  expires_in_days?: number;     // Default: 10, max: 30
  resend?: boolean;             // Force resend even if recently sent
}

// Response
{
  success: true;
  proposal_id: string;
  acceptance_url: string;
  expires_at: string;
  email_sent: boolean;
  email_queued_at: string;
}
```

---

### List & Lookup Endpoints

#### List Proposals
**Endpoint:** `GET /v1/proposals`
**Required Scope:** `proposals:read`

```typescript
// Query Parameters
{
  status?: string;              // draft|sent|viewed|signed|expired
  from?: string;                // ISO8601 date
  to?: string;                  // ISO8601 date
  partner_reference_id?: string;// Exact match
  client_email?: string;        // Exact match
  limit?: number;               // Default: 50, max: 100
  cursor?: string;              // For pagination
}

// Response
{
  success: true;
  proposals: [
    {
      proposal_id: string;
      partner_reference_id?: string;
      client_email: string;
      status: string;
      created_at: string;
      signed_at?: string;
      project_id?: string;        // Present if signed
    }
  ];
  pagination: {
    has_more: boolean;
    next_cursor?: string;
  };
}
```

#### Lookup by Partner Reference
**Endpoint:** `GET /v1/proposals/lookup`
**Required Scope:** `proposals:read`

```typescript
// Query Parameters
{
  partner_reference_id: string; // Required
}

// Response
{
  success: true;
  proposal: { ... } | null;
}
```

#### List Projects
**Endpoint:** `GET /v1/projects`
**Required Scope:** `projects:read`

```typescript
// Query Parameters
{
  status?: string;              // onboarding|submitted|validated|audit_ready
  provider?: string;            // Data access provider filter
  from?: string;                // ISO8601 date
  to?: string;                  // ISO8601 date
  partner_reference_id?: string;
  limit?: number;
  cursor?: string;
}
```

#### Client Projects (Multi-site Support)
**Endpoint:** `GET /v1/clients/{email}/projects`
**Required Scope:** `clients:read`

```typescript
// Response
{
  success: true;
  client: {
    email: string;
    first_name: string;
    last_name: string;
    company_name?: string;
  };
  projects: [
    {
      project_id: string;
      proposal_id: string;
      partner_reference_id?: string;
      address: string;
      system_size_kwp: number;
      status: string;
      signed_at: string;
    }
  ];
  total_kwp: number;            // Portfolio total
}
```

---

### Stage 3: Project Onboarding

#### Get Current Status (with ETag)
**Endpoint:** `GET /v1/projects/{project_id}`
**Required Scope:** `projects:read`

```typescript
// Response Headers
ETag: "a1b2c3d4"

// Response Body
{
  project_id: string;
  proposal_id: string;
  partner_reference_id?: string;
  version: number;                // For optimistic concurrency
  
  status: {
    onboarding_complete: boolean;
    submitted_for_review: boolean;
    admin_validated: boolean;
    audit_ready: boolean;
  };
  
  completion: {
    fields_complete: number;
    fields_required: number;
    percentage: number;
    missing_fields: string[];
  };
  
  documents: {
    coc_uploaded: boolean;
    invoice_uploaded: boolean;
  };
  
  data_access: {
    configured: boolean;
    provider?: string;
    status?: "pending" | "verified" | "failed";
  };
}
```

---

#### Update Onboarding Data (PATCH with Concurrency)
**Endpoint:** `PATCH /v1/projects/{project_id}/onboarding`
**Required Scope:** `projects:onboarding:write`

```typescript
// Request Headers
If-Match: "a1b2c3d4"              // Required - from GET ETag

// Request Body - all fields optional
{
  system: {
    inverter_brand?: string;
    inverter_model?: string;
    inverter_serial?: string;
    inverter_capacity_kw?: number;
    inverter_quantity?: number;
    panel_brand?: string;
    panel_quantity?: number;
    panel_size_wp?: number;
    panel_total_kwp?: number;
    has_battery?: boolean;
    battery_brand?: string;
    battery_capacity_kwh?: string;
  };
  
  installation: {
    total_capex?: number;
    ownership_type?: "owned" | "ppa" | "lease";
    has_maintenance_agreement?: boolean;
    maintenance_cost_annual?: number;
  };
  
  installer: {
    company_name?: string;
    email?: string;
  };
  
  location: {
    address?: string;
    gps_lat?: number;
    gps_lng?: number;
  };
}

// Response Headers
ETag: "e5f6g7h8"                  // New version

// Response Body
{
  success: true;
  project_id: string;
  version: number;                // Incremented
  
  completion: {
    fields_complete: number;
    fields_required: number;
    percentage: number;
    missing_fields: string[];
  };
  
  updated_fields: string[];
  skipped_fields: string[];
}
```

#### Concurrency Error
```typescript
// 412 Precondition Failed
{
  success: false;
  error: {
    code: "CONCURRENCY_CONFLICT",
    message: "Resource was modified. Fetch latest version and retry.",
    current_etag: "x9y0z1a2"
  }
}
```

---

#### Submit for Review
**Endpoint:** `POST /v1/projects/{project_id}/onboarding/submit`
**Required Scope:** `projects:onboarding:write`

```typescript
// Request
{
  confirm_complete: true;
}

// Response
{
  success: true;
  project_id: string;
  submitted_at: string;
  status: "submitted_for_review";
  
  // If not ready
  errors?: {
    missing_fields: string[];
    missing_documents: string[];
  };
}
```

---

#### Document Upload (Pre-signed URLs)

**Step 1: Get Pre-signed Upload URL**
**Endpoint:** `POST /v1/projects/{project_id}/documents/presign`
**Required Scope:** `projects:documents:write`

```typescript
// Request
{
  category: "coc" | "invoice" | "installation_photo" | "panel_layout" | "other";
  file_name: string;
  content_type: string;
  file_size_bytes: number;
  
  // Optional metadata (helps audit teams)
  metadata?: {
    invoice_date?: string;        // YYYY-MM-DD
    invoice_total?: number;       // ZAR
    coc_number?: string;
    photo_description?: string;
  };
}

// Response
{
  success: true;
  upload_url: string;
  upload_expires_at: string;
  document_id: string;
  upload_headers: {
    "Content-Type": string;
  };
}
```

**Step 2: Confirm Upload**
**Endpoint:** `POST /v1/projects/{project_id}/documents/{document_id}/confirm`
**Required Scope:** `projects:documents:write`

```typescript
// Request
{
  checksum?: string;              // Optional MD5/SHA256
}

// Response
{
  success: true;
  document_id: string;
  category: string;
  file_url: string;
  uploaded_at: string;
  virus_scan_status: "pending" | "clean" | "infected";
  metadata?: { ... };
}
```

**Alternative: Direct URL (v1 compatibility)**
**Endpoint:** `POST /v1/projects/{project_id}/documents`

```typescript
// Request
{
  category: "coc" | "invoice";
  url: string;
  file_name?: string;
  metadata?: { ... };
}

// Response
{
  success: true;
  document_id: string;
  warning: "External URLs may become inaccessible. Consider using presigned uploads."
}
```

---

### Stage 4: Configure Data Access

**Endpoint:** `POST /v1/projects/{project_id}/data-access`
**Required Scope:** `projects:data_access:write`

```typescript
// Request
{
  provider: string;               // huawei, growatt, solaredge, sungrow, etc.
  credential_method: "delegated_access" | "api_key";
  
  // For delegated access
  site_id?: string;
  portal_url?: string;
  
  // Track who granted access
  delegated_access?: {
    granted_by_email?: string;    // Who is granting access
    granted_by_role?: "owner" | "installer" | "oem_support";
  };
  
  // For API key method
  api_key?: string;               // Encrypted at rest
}

// Response
{
  success: true;
  data_access_id: string;
  provider: string;
  status: "pending_verification";
  
  next_steps?: {
    delegated_email: "data@crunchcarbon.com";
    instructions: string;
    instructions_url?: string;
  };
  
  instructions_sent: boolean;
}
```

---

## Webhooks

### Register Webhook
**Endpoint:** `POST /v1/webhooks`
**Required Scope:** `webhooks:manage`

```typescript
// Request
{
  url: string;                    // HTTPS required
  events: string[];               // Events to subscribe to
  secret?: string;                // For HMAC signing (optional, we can generate)
}

// Response
{
  success: true;
  webhook_id: string;
  events: string[];
  secret: string;                 // Generated if not provided (SAVE THIS)
  verification_pending: true;
}
```

### Webhook Verification Flow

**Automatic Verification:**
1. On registration, we send a `webhook.verification` event
2. Partner must respond 2xx with body: `{ "verification_token": "<token>" }`
3. Webhook becomes active

**Manual Verification:**
**Endpoint:** `POST /v1/webhooks/{webhook_id}/verify`
```typescript
// Triggers a test delivery
// Response
{
  success: true;
  delivery_id: string;
  status: "sent";
}
```

### View Delivery History
**Endpoint:** `GET /v1/webhooks/{webhook_id}/deliveries`
**Required Scope:** `webhooks:manage`

```typescript
// Query Parameters
{
  limit?: number;                 // Default: 20, max: 100
}

// Response
{
  success: true;
  deliveries: [
    {
      delivery_id: string;
      event: string;
      status: "delivered" | "failed" | "pending";
      attempt: number;
      sent_at: string;
      response_status?: number;
      response_time_ms?: number;
      next_retry_at?: string;
    }
  ];
}
```

### Webhook Delivery

#### Headers
```text
X-CC-Event: proposal.signed
X-CC-Timestamp: 1706745600
X-CC-Signature: sha256=abc123...
X-CC-Delivery-Id: uuid
X-CC-Attempt: 1
```

#### Signature Verification
```text
signature = HMAC-SHA256(webhook_secret, timestamp + "." + payload)
```

#### Retry Policy
- Exponential backoff: 30s, 2m, 10m, 1h, 6h, 24h
- Max retries: 6 (over 48 hours)
- After max failures: webhook disabled, partner notified via email

### Available Events
| Event | Trigger | Payload Includes |
|-------|---------|------------------|
| `webhook.verification` | On registration | verification_token |
| `proposal.created` | Proposal created | proposal_id, estimates |
| `proposal.viewed` | Client viewed | proposal_id, viewed_at |
| `proposal.signed` | Agreement signed | proposal_id, project_id, agreement_id |
| `proposal.rejected` | Client declined | proposal_id |
| `proposal.expired` | Invitation expired | proposal_id |
| `project.onboarding_complete` | All fields submitted | project_id |
| `project.audit_ready` | Admin approved | project_id |
| `data_access.verified` | Monitoring confirmed | project_id, provider |

---

## Sandbox / Test Mode

### Behavior
- Test API keys (`cc_test_*`) use sandbox environment
- No real emails sent (logged only)
- Full API functionality

### Email Preview (Test Mode Only)
**Endpoint:** `GET /v1/proposals/{proposal_id}/email-preview`
**Required Scope:** `proposals:read`

```typescript
// Response (only in test mode)
{
  success: true;
  email: {
    to: string;
    subject: string;
    html: string;
    text: string;
  };
}
```

---

## Rate Limiting

### Limits Structure
| Limit Type | Default | Configurable |
|------------|---------|--------------|
| Per second (burst) | 20 req/s for 10s | Yes |
| Per minute | 100 req/min | Yes |
| Per day | 10,000 req/day | Yes |

### Rate Limit Headers
```text
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1706745600
Retry-After: 30
```

---

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "System size must be between 0.1 and 15000 kWp",
    "field": "project.system_size_kwp",
    "received": 20000
  },
  "request_id": "req_abc123def456"
}
```

### Error Codes
| Code | HTTP | Description |
|------|------|-------------|
| `UNAUTHORIZED` | 401 | Invalid/missing API key |
| `FORBIDDEN` | 403 | Key lacks required scope |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `CONSENT_REQUIRED` | 400 | Consent not provided |
| `INVALID_COUNTRY` | 400 | Only ZA supported |
| `SYSTEM_SIZE_OUT_OF_RANGE` | 400 | Size not 0.1-15000 kWp |
| `COMMISSIONING_TOO_EARLY` | 400 | Must be 2022+ |
| `DUPLICATE_REFERENCE_ID` | 409 | partner_reference_id already used |
| `DUPLICATE_PROPOSAL` | 409 | Fuzzy match found (returns matches) |
| `PROPOSAL_ALREADY_SIGNED` | 409 | Cannot modify signed |
| `CONCURRENCY_CONFLICT` | 412 | ETag mismatch |
| `RATE_LIMITED` | 429 | Too many requests |
| `SCOPE_INSUFFICIENT` | 403 | Missing required scope |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Database Schema

### New Table: `partners`
```sql
CREATE TABLE partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_email text NOT NULL,
  logo_url text,                          -- For email co-branding (max 120x40px)
  support_email text,                     -- Shown in email footer
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### New Table: `partner_api_keys`
```sql
CREATE TABLE partner_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  
  api_key_hash text NOT NULL,             -- bcrypt hash
  api_key_prefix text NOT NULL,           -- "cc_live_abc" for identification
  environment text NOT NULL DEFAULT 'test', -- 'live' or 'test'
  
  scopes jsonb NOT NULL DEFAULT '["proposals:create", "proposals:read", "proposals:send", "projects:read", "projects:onboarding:write"]',
  
  rate_limit_per_minute int DEFAULT 100,
  rate_limit_per_day int DEFAULT 10000,
  
  is_active boolean DEFAULT true,
  last_used_at timestamptz,
  request_count bigint DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX idx_partner_api_keys_prefix ON partner_api_keys(api_key_prefix);
CREATE INDEX idx_partner_api_keys_partner ON partner_api_keys(partner_id);
```

### New Table: `partner_webhook_subscriptions`
```sql
CREATE TABLE partner_webhook_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  
  url text NOT NULL,
  events text[] NOT NULL,
  signing_secret_encrypted text NOT NULL, -- Encrypted (NOT hashed) for HMAC signing
  
  is_verified boolean DEFAULT false,
  verified_at timestamptz,
  is_active boolean DEFAULT true,
  
  last_triggered_at timestamptz,
  consecutive_failures int DEFAULT 0,
  disabled_at timestamptz,
  disabled_reason text,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_partner_webhooks_partner ON partner_webhook_subscriptions(partner_id);
```

### New Table: `partner_webhook_deliveries`
```sql
CREATE TABLE partner_webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES partner_webhook_subscriptions(id) ON DELETE CASCADE,
  
  event text NOT NULL,
  payload jsonb NOT NULL,
  
  attempt int DEFAULT 1,
  status text NOT NULL DEFAULT 'pending', -- pending, delivered, failed
  
  response_status int,
  response_body text,
  response_time_ms int,
  
  sent_at timestamptz,
  next_retry_at timestamptz,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_webhook_deliveries_webhook ON partner_webhook_deliveries(webhook_id, created_at DESC);
```

### New Table: `partner_api_logs`
```sql
CREATE TABLE partner_api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partners(id),
  api_key_id uuid REFERENCES partner_api_keys(id),
  
  request_id text NOT NULL,
  method text NOT NULL,
  path text NOT NULL,
  status_code int NOT NULL,
  
  -- Sanitized (no secrets, no sensitive data)
  request_body_sanitized jsonb,
  response_body jsonb,
  
  ip_address inet,
  duration_ms int,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_partner_api_logs_partner ON partner_api_logs(partner_id, created_at DESC);
CREATE INDEX idx_partner_api_logs_request ON partner_api_logs(request_id);

-- Auto-cleanup: keep 90 days
-- (implement via pg_cron or edge function)
```

### Column Additions to `proposals`
```sql
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES partners(id);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS partner_reference_id text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS consent_obtained_at timestamptz;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS consent_source text;

-- Unique constraint for partner reference
CREATE UNIQUE INDEX idx_proposals_partner_reference 
  ON proposals(partner_id, partner_reference_id) 
  WHERE partner_id IS NOT NULL AND partner_reference_id IS NOT NULL;

-- Index for partner lookups
CREATE INDEX idx_proposals_partner ON proposals(partner_id) WHERE partner_id IS NOT NULL;
```

### Column Additions to `project_onboarding`
```sql
ALTER TABLE project_onboarding ADD COLUMN IF NOT EXISTS version int DEFAULT 1;
ALTER TABLE project_onboarding ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Trigger to increment version on update
CREATE OR REPLACE FUNCTION increment_project_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version := OLD.version + 1;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_onboarding_version
  BEFORE UPDATE ON project_onboarding
  FOR EACH ROW EXECUTE FUNCTION increment_project_version();
```

### Column Additions to `data_access_config`
```sql
ALTER TABLE data_access_config ADD COLUMN IF NOT EXISTS granted_by_email text;
ALTER TABLE data_access_config ADD COLUMN IF NOT EXISTS granted_by_role text;
```

### Column Additions to `onboarding_documents`
```sql
ALTER TABLE onboarding_documents ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
```

---

## Edge Functions

### New Functions
| Function | Path | Purpose |
|----------|------|---------|
| `partner-api` | `/v1/*` | Main router, auth, rate limiting, scope checks |
| `partner-webhooks` | Internal | Dispatch webhook events with retries |

### Shared Modules (in `_shared/`)
| Module | Purpose |
|--------|---------|
| `partner-auth.ts` | API key validation, rate limiting, scope checking, logging |
| `partner-types.ts` | TypeScript interfaces |
| `partner-validation.ts` | Zod schemas for all endpoints |
| `partner-responses.ts` | Standardized response formatting |
| `partner-crypto.ts` | Webhook secret encryption/decryption |

---

## Email Integration

All client-facing emails include partner attribution:

### Co-branding Rules
- Partner logo: max 120x40px, displayed alongside Crunch Carbon logo
- Attribution text: "Created in partnership with [Partner Name]"
- Support: Crunch Carbon contact primary, partner secondary (if provided)

---

## Security Checklist

- [ ] API keys hashed with bcrypt (never stored plain)
- [ ] Webhook secrets encrypted at rest (NOT hashed - needed for HMAC)
- [ ] Consent timestamp stored for POPIA compliance
- [ ] Rate limiting enforced at edge function level (burst/min/day)
- [ ] Pre-signed URLs expire after 15 minutes
- [ ] All external URLs validated before storage
- [ ] Document virus scanning integration
- [ ] No sensitive data in `partner_api_logs`
- [ ] Scope checks on every endpoint
- [ ] ETag/version for concurrency control

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Database schema (partners, partner_api_keys, partner_api_logs)
- [ ] Partner and API key management
- [ ] Core router edge function (`partner-api`)
- [ ] Authentication middleware with scope checking
- [ ] Rate limiting (burst/min/day)
- [ ] Error response standardization

### Phase 2: Proposal Flow (Week 2)
- [ ] `POST /v1/proposals` (with dedupe logic)
- [ ] `POST /v1/proposals/{id}/send-acceptance-link`
- [ ] `GET /v1/proposals/{id}`
- [ ] `GET /v1/proposals` (list with filters)
- [ ] `GET /v1/proposals/lookup`
- [ ] Email integration with partner attribution
- [ ] Eligibility validation (country, size, date)

### Phase 3: Onboarding Flow (Week 3)
- [ ] `GET /v1/projects/{id}` with ETag
- [ ] `PATCH /v1/projects/{id}/onboarding` with If-Match
- [ ] `POST /v1/projects/{id}/onboarding/submit`
- [ ] `GET /v1/projects` (list with filters)
- [ ] `GET /v1/clients/{email}/projects`
- [ ] Pre-signed document uploads with metadata
- [ ] Completion tracking with `missing_fields`

### Phase 4: Data Access + Webhooks (Week 4)
- [ ] `POST /v1/projects/{id}/data-access` (with granted_by)
- [ ] Webhook subscription + verification flow
- [ ] Webhook delivery with retries
- [ ] `GET /v1/webhooks/{id}/deliveries`
- [ ] Partner API logs + cleanup job

### Phase 5: Polish & Launch (Week 5)
- [ ] OpenAPI 3.0 specification
- [ ] Postman collection
- [ ] `GET /v1/proposals/{id}/email-preview` (sandbox)
- [ ] Integration guides
- [ ] Sandbox testing with pilot partner

---

## Documentation Deliverables

| Document | Format | Audience |
|----------|--------|----------|
| API Reference | OpenAPI 3.0 | Developers |
| Quick Start Guide | Markdown | Integration team |
| Authentication & Scopes | Markdown | DevOps |
| Webhook Guide | Markdown | Developers |
| Error Reference | Markdown | Support |

---

## Out of Scope (Phase 2)

1. **Energy Data Ingestion API** - Partners pushing generation data
2. **Real-time Telemetry** - Live energy monitoring feeds
3. **Partner Dashboard UI** - Self-service partner management
4. **Custom Revenue Splits** - Partner-specific commission structures
5. **White-Label Emails** - Fully partner-branded communications
6. **Bulk Write Operations** - Batch proposal/project creation

