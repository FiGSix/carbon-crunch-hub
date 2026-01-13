# Database Schema Documentation

**Last Updated:** January 2026  
**Database:** PostgreSQL (Supabase)  
**Total Tables:** 34  
**Total Migrations:** 216+

---

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Core Tables](#core-tables)
3. [Proposal Tables](#proposal-tables)
4. [Onboarding Tables](#onboarding-tables)
5. [System Tables](#system-tables)
6. [Database Functions](#database-functions)
7. [RLS Policies](#rls-policies)
8. [Indexes](#indexes)

---

## Schema Overview

### Entity Relationship Diagram

```
                                    ┌─────────────────┐
                                    │   auth.users    │
                                    │   (Supabase)    │
                                    └────────┬────────┘
                                             │
                                             │ 1:1
                                             ▼
┌─────────────────┐    1:N    ┌─────────────────────────┐    N:1    ┌─────────────────┐
│    companies    │◀──────────│       profiles          │──────────▶│ client_companies│
│ (agent orgs)    │           │   (all user types)      │           │  (client orgs)  │
└────────┬────────┘           └───────────┬─────────────┘           └────────┬────────┘
         │                                │                                   │
         │ 1:N                            │ 1:N                              │ 1:N
         ▼                                ▼                                   ▼
┌─────────────────┐              ┌─────────────────┐              ┌─────────────────────┐
│ company_members │              │     clients     │              │client_company_members│
└─────────────────┘              │ (contact records)│              └─────────────────────┘
                                 └────────┬────────┘
                                          │
                                          │ 1:N
                                          ▼
                                 ┌─────────────────┐
                                 │    proposals    │
                                 └────────┬────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
                    ▼                     ▼                     ▼
          ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
          │proposal_agreements│   │  email_events   │   │project_onboarding│
          └─────────────────┘   └─────────────────┘   └────────┬────────┘
                                                               │
                                          ┌────────────────────┼────────────────────┐
                                          │                    │                    │
                                          ▼                    ▼                    ▼
                                ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
                                │onboarding_fields│  │onboarding_docs  │  │ onboarding_tasks│
                                └─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## Core Tables

### profiles

Extends `auth.users` with application-specific data.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK, references auth.users |
| `email` | TEXT | User email |
| `first_name` | TEXT | First name |
| `last_name` | TEXT | Last name |
| `role` | TEXT | 'admin', 'agent', 'client' |
| `phone` | TEXT | Phone number |
| `company_name` | TEXT | For agents |
| `company_logo_url` | TEXT | Agent branding |
| `agent_status` | TEXT | 'pending_approval', 'approved', 'rejected' |
| `commission_override` | NUMERIC | Custom commission % |
| `onboarding_completed` | BOOLEAN | Profile setup complete |
| `terms_accepted_at` | TIMESTAMPTZ | T&C acceptance |
| `created_at` | TIMESTAMPTZ | Registration date |
| `last_active_at` | TIMESTAMPTZ | Last activity |
| `deleted_at` | TIMESTAMPTZ | Soft delete |

**Key Relationships:**
- `auth.users.id` → `profiles.id`
- `profiles.id` → `company_members.user_id`
- `profiles.id` → `proposals.agent_id`
- `profiles.id` → `proposals.client_id`

---

### companies

Agent organizations/teams.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `company_name` | TEXT | Organization name |
| `email_domain` | TEXT | For auto-join |
| `created_by` | UUID | Creator profile |
| `created_at` | TIMESTAMPTZ | Creation date |

---

### company_members

Links agents to companies.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `company_id` | UUID | FK → companies |
| `user_id` | UUID | FK → profiles |
| `role` | TEXT | 'owner', 'admin', 'member' |
| `status` | TEXT | 'active', 'pending', 'removed' |
| `invited_by` | UUID | Inviting user |
| `approved_by` | UUID | Approving admin |

---

### clients

Client contact records (may or may not be registered users).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `email` | TEXT | UNIQUE, client email |
| `first_name` | TEXT | First name |
| `last_name` | TEXT | Last name |
| `company_name` | TEXT | Client organization |
| `phone` | TEXT | Phone number |
| `user_id` | UUID | FK → profiles (if registered) |
| `client_company_id` | UUID | FK → client_companies |
| `created_by` | UUID | Agent who created |
| `first_agreement_id` | UUID | First signed proposal |
| `cession_signed_at` | TIMESTAMPTZ | Cession agreement date |
| `portfolio_client_share_override` | NUMERIC | Custom share % |
| `notes` | TEXT | Agent notes |

**Important:** A client record may exist before the user registers. The `user_id` is linked when they accept a proposal and register.

---

### client_companies

Client organizations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `company_name` | TEXT | Organization name |
| `email_domain` | TEXT | For auto-join |
| `registration_number` | TEXT | Company reg number |
| `created_by` | UUID | Creator |

---

### client_company_members

Links clients to their organizations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `client_company_id` | UUID | FK → client_companies |
| `user_id` | UUID | FK → profiles |
| `role` | TEXT | 'owner', 'admin', 'member' |
| `status` | TEXT | 'active', 'pending' |
| `can_sign_agreements` | BOOLEAN | Signing authority |

---

## Proposal Tables

### proposals

Main proposal table.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `title` | TEXT | Proposal title |
| `status` | TEXT | See status values below |
| `agent_id` | UUID | FK → profiles (agent) |
| `client_id` | UUID | FK → profiles (if registered) |
| `client_reference_id` | UUID | FK → clients |
| `company_id` | UUID | FK → companies |
| `content` | JSONB | Proposal content (clientInfo, etc.) |
| `project_info` | JSONB | Project details |
| `eligibility_criteria` | JSONB | Eligibility answers |
| `system_size_kwp` | NUMERIC | System size in kWp |
| `annual_energy` | NUMERIC | Annual energy (kWh) |
| `carbon_credits` | NUMERIC | Carbon credits (tonnes) |
| `client_share_percentage` | NUMERIC | Client revenue share |
| `agent_commission_percentage` | NUMERIC | Agent commission |
| `unit_standard` | TEXT | 'kwp' or 'mwp' |
| `invitation_token` | TEXT | UNIQUE access token |
| `invitation_sent_at` | TIMESTAMPTZ | Email sent time |
| `invitation_viewed_at` | TIMESTAMPTZ | First view time |
| `invitation_expires_at` | TIMESTAMPTZ | Token expiry |
| `signed_at` | TIMESTAMPTZ | Signature time |
| `archived_at` | TIMESTAMPTZ | Archive time |
| `deleted_at` | TIMESTAMPTZ | Soft delete |
| `review_later_until` | TIMESTAMPTZ | Review reminder date |
| `last_email_event_type` | TEXT | Latest email status |
| `engagement_count` | INTEGER | View count |
| `automation_paused` | BOOLEAN | Pause email automation |

**Status Values:**
- `draft` - Not yet sent
- `sent` - Email sent
- `delivered` - Email delivered
- `opened` - Email opened
- `viewed` - Proposal viewed
- `accepted` - Proposal signed
- `rejected` - Client rejected
- `stale` - No response (14+ days)
- `bounced` - Email bounced

---

### proposal_agreements

Digital signature records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `proposal_id` | UUID | FK → proposals |
| `signed_by` | UUID | FK → profiles |
| `signed_at` | TIMESTAMPTZ | Signature time |
| `signature_type` | ENUM | 'typed', 'drawn' |
| `typed_name` | TEXT | Typed signature |
| `signature_image_url` | TEXT | Drawn signature URL |
| `ip_address` | INET | Signer IP |
| `user_agent` | TEXT | Browser info |
| `accepted_terms_version` | TEXT | T&C version |
| `witness_1_name` | TEXT | First witness |
| `witness_2_name` | TEXT | Second witness |

---

### email_events

Resend webhook event tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `proposal_id` | UUID | FK → proposals |
| `message_id` | TEXT | Resend message ID |
| `event_type` | TEXT | 'sent', 'delivered', 'opened', etc. |
| `recipient_email` | TEXT | Email recipient |
| `occurred_at` | TIMESTAMPTZ | Event time |
| `raw_payload` | JSONB | Full webhook payload |
| `bounce_reason` | TEXT | Bounce details |
| `click_url` | TEXT | Clicked link |

---

### proposal_automation_log

Email automation tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `proposal_id` | UUID | FK → proposals |
| `automation_type` | TEXT | 'status_change', 'email_sent' |
| `trigger_event` | TEXT | Triggering event |
| `old_status` | TEXT | Previous status |
| `new_status` | TEXT | New status |
| `email_type` | TEXT | Email template used |
| `email_message_id` | TEXT | Resend message ID |

---

## Onboarding Tables

### project_onboarding

Post-signature project tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `proposal_id` | UUID | FK → proposals (UNIQUE) |
| `onboarding_complete` | BOOLEAN | All steps done |
| `submitted_for_review` | BOOLEAN | Client submitted |
| `admin_validated` | BOOLEAN | Admin approved |
| `audit_ready` | BOOLEAN | Ready for audit |
| `data_access_verified` | BOOLEAN | Monitoring connected |
| `assigned_epc_id` | UUID | Assigned installer |
| `last_activity_at` | TIMESTAMPTZ | Last update |

---

### onboarding_fields

Technical system details.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `project_id` | UUID | FK → project_onboarding |
| `system_name` | TEXT | System identifier |
| `system_address` | TEXT | Installation address |
| `system_gps_lat` | NUMERIC | Latitude |
| `system_gps_lng` | NUMERIC | Longitude |
| `panel_brand` | TEXT | Panel manufacturer |
| `panel_quantity` | INTEGER | Number of panels |
| `panel_size_wp` | NUMERIC | Panel wattage |
| `panel_total_kwp` | NUMERIC | Total system size |
| `inverter_brand` | TEXT | Inverter manufacturer |
| `inverter_capacity_kw` | NUMERIC | Inverter size |
| `commissioning_date` | DATE | System commission date |
| `connection_type` | TEXT | Grid connection type |
| `ownership_type` | TEXT | Ownership structure |
| `total_capex` | NUMERIC | Total investment |

---

### onboarding_documents

Uploaded documents.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `project_id` | UUID | FK → project_onboarding |
| `category` | TEXT | Document type |
| `file_name` | TEXT | Original filename |
| `file_url` | TEXT | Storage URL |
| `file_size_bytes` | INTEGER | File size |
| `mime_type` | TEXT | File type |
| `uploaded_by` | UUID | Uploader |
| `is_validated` | BOOLEAN | Admin validated |
| `version` | INTEGER | Document version |

**Document Categories:**
- `coc` - Certificate of Compliance
- `invoice` - System invoice
- `installation_photos` - Site photos
- `meter_readings` - Meter documentation
- `grid_connection` - Utility documents
- `other` - Miscellaneous

---

### onboarding_tasks

Task checklist per project.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `project_id` | UUID | FK → project_onboarding |
| `title` | TEXT | Task title |
| `description` | TEXT | Task details |
| `status` | TEXT | 'pending', 'in_progress', 'complete' |
| `category` | TEXT | Task category |
| `assigned_to` | UUID | Assigned user |
| `due_date` | DATE | Due date |
| `completed_at` | TIMESTAMPTZ | Completion time |
| `completed_by` | UUID | Who completed |

---

### onboarding_comments

Collaboration comments.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `project_id` | UUID | FK → project_onboarding |
| `author_id` | UUID | FK → profiles |
| `content` | TEXT | Comment text |
| `parent_comment_id` | UUID | For threading |
| `mentioned_users` | UUID[] | @mentions |

---

## System Tables

### system_settings

Global configuration.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `setting_key` | TEXT | UNIQUE key |
| `setting_value` | JSONB | Configuration value |
| `description` | TEXT | Setting description |

**Key Settings:**
- `carbon_price_per_tonne` - Annual pricing
- `default_client_share` - Default share %
- `email_templates` - Template content

---

### legal_documents

Terms and conditions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `document_type` | TEXT | 'terms', 'privacy', 'cession' |
| `title` | TEXT | Document title |
| `content` | TEXT | Document HTML |
| `current_version` | INTEGER | Version number |
| `is_active` | BOOLEAN | Currently active |
| `effective_date` | DATE | Effective date |

---

### notifications

In-app notifications.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | Recipient |
| `type` | TEXT | Notification type |
| `title` | TEXT | Notification title |
| `message` | TEXT | Notification body |
| `read` | BOOLEAN | Read status |
| `related_type` | TEXT | 'proposal', 'onboarding' |
| `related_id` | UUID | Related record |

---

## Database Functions

### Trigger Functions

| Function | Trigger On | Purpose |
|----------|-----------|---------|
| `handle_new_user()` | `auth.users` INSERT | Creates profile with correct role |
| `sync_client_record_on_team_join()` | `client_company_members` INSERT | Links client record to user |
| `auto_create_client_company()` | `profiles` INSERT (client) | Creates client company |
| `update_updated_at_column()` | Various tables UPDATE | Maintains `updated_at` |

### RPC Functions

| Function | Parameters | Returns | Purpose |
|----------|-----------|---------|---------|
| `get_dashboard_metrics_by_stage()` | `user_id`, `user_role` | JSONB | Dashboard aggregation |
| `get_proposal_by_token()` | `token` | proposal row | Token-based access |
| `can_transition_proposal_status()` | `proposal_id`, `new_status` | BOOLEAN | Validates transitions |
| `increment_proposal_engagement()` | `proposal_id` | void | Tracks views |
| `search_clients_unified()` | `search_term`, `agent_id` | client rows | Client search |

---

## RLS Policies

### Policy Patterns

**Self-Access Pattern:**
```sql
CREATE POLICY "Users can view own data"
ON table_name FOR SELECT
USING (user_id = auth.uid());
```

**Admin Override Pattern:**
```sql
CREATE POLICY "Admins can view all"
ON table_name FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

**Company-Based Access:**
```sql
CREATE POLICY "Company members can view"
ON table_name FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM company_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
);
```

### Tables with RLS Enabled

All 34 tables have RLS enabled. Key policies:

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | Self + Admin | Self | Self + Admin | Admin only |
| `proposals` | Agent/Client/Admin | Agent | Agent + Admin | Agent (soft) |
| `clients` | Creator + Admin | Agent | Agent + Admin | Admin only |
| `project_onboarding` | Client/Agent/Admin | System | Client/Admin | Admin only |

---

## Indexes

### Key Indexes

```sql
-- Proposals
CREATE INDEX idx_proposals_agent_id ON proposals(agent_id);
CREATE INDEX idx_proposals_client_reference_id ON proposals(client_reference_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_invitation_token ON proposals(invitation_token);

-- Clients
CREATE UNIQUE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_clients_created_by ON clients(created_by);

-- Email Events
CREATE INDEX idx_email_events_proposal_id ON email_events(proposal_id);
CREATE INDEX idx_email_events_message_id ON email_events(message_id);

-- Onboarding
CREATE UNIQUE INDEX idx_project_onboarding_proposal_id ON project_onboarding(proposal_id);
```

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [AUTH_FLOW.md](./AUTH_FLOW.md) - Authentication details
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues
