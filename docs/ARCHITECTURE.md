# System Architecture

**Last Updated:** January 2026

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Data Flow](#data-flow)
5. [Security Architecture](#security-architecture)
6. [Deployment Architecture](#deployment-architecture)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   React     │  │  TanStack   │  │   Tailwind  │  │   Sentry    │    │
│  │   Router    │  │   Query     │  │     CSS     │  │  Monitoring │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│                              │                                           │
│                    ┌─────────▼─────────┐                                │
│                    │   Supabase Client │                                │
│                    └─────────┬─────────┘                                │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │
                               │ HTTPS
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                            SUPABASE                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │    Auth     │  │  PostgreSQL │  │    Edge     │  │   Storage   │    │
│  │  (GoTrue)   │  │   + RLS     │  │  Functions  │  │   (S3)      │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│         │                │                │                │             │
│         └────────────────┴────────────────┴────────────────┘             │
│                                   │                                      │
└───────────────────────────────────┼──────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
            ┌───────▼───────┐ ┌─────▼─────┐ ┌──────▼──────┐
            │    Resend     │ │  Google   │ │   Mapbox    │
            │    (Email)    │ │   Maps    │ │ (Geocoding) │
            └───────────────┘ └───────────┘ └─────────────┘
```

---

## Frontend Architecture

### Component Hierarchy

```
App.tsx
├── ThemeProvider
├── QueryClientProvider
├── AuthProvider
│   ├── PublicRoutes
│   │   ├── Landing
│   │   ├── Login
│   │   ├── Register
│   │   └── ProposalAcceptance (token-based)
│   │
│   └── PrivateRoutes
│       ├── DashboardLayout
│       │   ├── Sidebar
│       │   ├── Header
│       │   └── Main Content
│       │       ├── Dashboard
│       │       ├── Proposals
│       │       ├── Clients
│       │       ├── CreateProposal
│       │       ├── ViewProposal
│       │       ├── Settings
│       │       └── Admin (admin only)
│       │
│       └── AgentApprovalGuard (agents only)
│           └── PendingApprovalPage
│
└── Toaster (notifications)
```

### State Management Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                     STATE MANAGEMENT                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐     ┌─────────────────┐                   │
│  │  React Query    │     │  React Context  │                   │
│  │  (Server State) │     │  (Client State) │                   │
│  ├─────────────────┤     ├─────────────────┤                   │
│  │ • Proposals     │     │ • Auth/User     │                   │
│  │ • Clients       │     │ • Theme         │                   │
│  │ • Dashboard     │     │ • UI State      │                   │
│  │ • Onboarding    │     │                 │                   │
│  └─────────────────┘     └─────────────────┘                   │
│           │                      │                              │
│           └──────────┬───────────┘                              │
│                      │                                          │
│           ┌──────────▼──────────┐                               │
│           │  Component State    │                               │
│           │  (Forms, Modals)    │                               │
│           └─────────────────────┘                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Frontend Services

| Service | Location | Purpose |
|---------|----------|---------|
| `UnifiedDataService` | `src/services/unified/` | Central data orchestration |
| `UnifiedCarbonService` | `src/services/calculations/carbon/` | Carbon credit calculations |
| `CacheManager` | `src/services/unified/cache/` | In-memory caching |
| `ProposalTransformer` | `src/services/proposal/` | Data transformation |

---

## Backend Architecture

### Edge Functions Organization

```
supabase/functions/
├── _shared/                    # Shared utilities
│   ├── cors.ts                 # CORS headers
│   ├── supabase.ts            # Supabase client factory
│   └── types.ts               # Shared types
│
├── Email Functions
│   ├── send-proposal-invitation/
│   ├── send-auth-email/
│   ├── send-agent-invitation/
│   ├── send-client-team-invitation/
│   ├── send-cession-agreement-email/
│   ├── send-weekly-roundup/
│   ├── resend-webhook/
│   └── proposal-automation/
│
├── PDF Functions
│   ├── generate-proposal-pdf/
│   └── generate-signed-agreement-pdf/
│
├── Proposal Functions
│   ├── accept-proposal/
│   ├── bulk-upload-proposals/
│   └── bulk-move-to-onboarding/
│
├── User Management
│   ├── manage-client-profile/
│   ├── manage-user-role/
│   └── delete-user/
│
└── External APIs
    ├── google-places-autocomplete/
    ├── google-place-details/
    └── mapbox-geocode/
```

### Database Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DATABASE SCHEMA                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   auth.     │    │  profiles   │    │  companies  │         │
│  │   users     │───▶│  (extends)  │◀───│  (agents)   │         │
│  └─────────────┘    └──────┬──────┘    └──────┬──────┘         │
│                            │                   │                 │
│                 ┌──────────┴──────────┐       │                 │
│                 │                     │       │                 │
│          ┌──────▼──────┐       ┌──────▼──────▼──────┐          │
│          │   clients   │       │  company_members   │          │
│          └──────┬──────┘       └────────────────────┘          │
│                 │                                               │
│          ┌──────▼──────┐                                       │
│          │  proposals  │                                       │
│          └──────┬──────┘                                       │
│                 │                                               │
│    ┌────────────┼────────────┐                                 │
│    │            │            │                                 │
│  ┌─▼──────┐  ┌──▼───────┐  ┌▼────────────┐                    │
│  │proposal│  │ email_   │  │  project_   │                    │
│  │agrmnts │  │ events   │  │ onboarding  │                    │
│  └────────┘  └──────────┘  └──────┬──────┘                    │
│                                   │                            │
│                    ┌──────────────┼──────────────┐            │
│                    │              │              │            │
│              ┌─────▼────┐  ┌─────▼────┐  ┌─────▼────┐        │
│              │onboarding│  │onboarding│  │onboarding│        │
│              │  fields  │  │   docs   │  │  tasks   │        │
│              └──────────┘  └──────────┘  └──────────┘        │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Database Functions (Key)

| Function | Trigger | Purpose |
|----------|---------|---------|
| `handle_new_user()` | `auth.users` INSERT | Creates profile |
| `sync_client_record_on_team_join()` | `client_company_members` INSERT | Links client to user |
| `auto_create_client_company()` | `profiles` INSERT (client) | Creates client company |
| `can_transition_proposal_status()` | — | Validates status changes |
| `get_dashboard_metrics_by_stage()` | — | Dashboard aggregation |
| `increment_proposal_engagement()` | — | Email tracking |

---

## Data Flow

### Proposal Creation Flow

```
┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────┐
│  Agent  │───▶│CreateProposal│───▶│  Supabase   │───▶│proposals│
│   UI    │    │   Form      │    │   Insert    │    │  table  │
└─────────┘    └─────────────┘    └─────────────┘    └────┬────┘
                                                          │
                                                          ▼
┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────┐
│  Email  │◀───│   Resend    │◀───│ Edge Func   │◀───│ Trigger │
│  Sent   │    │   API       │    │send-proposal│    │  /RPC   │
└─────────┘    └─────────────┘    └─────────────┘    └─────────┘
```

### Proposal Acceptance Flow

```
┌─────────┐    ┌─────────────┐    ┌─────────────┐
│  Email  │───▶│ProposalAccept│───▶│   Verify    │
│  Link   │    │   Page      │    │   Token     │
└─────────┘    └─────────────┘    └──────┬──────┘
                                         │
                                         ▼
┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌──────────┐
│Onboarding│◀──│  project_   │◀───│accept-proposal◀──│Signature │
│ Created │    │ onboarding  │    │ Edge Func   │    │ Submit   │
└─────────┘    └─────────────┘    └─────────────┘    └──────────┘
```

### Email Tracking Flow

```
┌─────────┐    ┌─────────────┐    ┌─────────────┐
│  Resend │───▶│  Webhook    │───▶│email_events │
│ Events  │    │ Edge Func   │    │   table     │
└─────────┘    └─────────────┘    └──────┬──────┘
                                         │
                                         ▼
                                  ┌─────────────┐
                                  │  Update     │
                                  │  Proposal   │
                                  │  Status     │
                                  └─────────────┘
```

---

## Security Architecture

### Row Level Security (RLS)

All tables have RLS enabled. Key policies:

```sql
-- Users see own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Admins see all
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Agents see own proposals
CREATE POLICY "Agents can view own proposals"
ON proposals FOR SELECT
USING (agent_id = auth.uid());

-- Clients see proposals linked to them
CREATE POLICY "Clients can view own proposals"
ON proposals FOR SELECT
USING (
  client_id = auth.uid() OR
  client_reference_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  )
);
```

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────┐     ┌───────────┐     ┌───────────┐             │
│  │   Login   │────▶│  Supabase │────▶│   JWT     │             │
│  │   Form    │     │   Auth    │     │  Token    │             │
│  └───────────┘     └───────────┘     └─────┬─────┘             │
│                                            │                    │
│                              ┌─────────────┴─────────────┐     │
│                              │                           │     │
│                        ┌─────▼─────┐              ┌──────▼────┐│
│                        │  Session  │              │  Profile  ││
│                        │  Storage  │              │   Fetch   ││
│                        └───────────┘              └─────┬─────┘│
│                                                         │      │
│                                                   ┌─────▼─────┐│
│                                                   │AuthContext││
│                                                   │   Update  ││
│                                                   └───────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### API Security

| Layer | Protection |
|-------|------------|
| Transport | HTTPS only |
| Authentication | Supabase JWT |
| Authorization | RLS policies |
| Edge Functions | Auth token validation |
| External APIs | Server-side only (secrets) |

---

## Deployment Architecture

### Production Environment

```
┌─────────────────────────────────────────────────────────────────┐
│                      LOVABLE CLOUD                               │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   CDN (Global Edge)                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │   Static    │  │   Assets    │  │   Cached    │     │   │
│  │  │   Files     │  │   (JS/CSS)  │  │  Responses  │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Supabase Project                       │   │
│  │                                                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │   │
│  │  │   Auth   │  │ Database │  │  Edge    │  │ Storage │ │   │
│  │  │  Service │  │ (Postgres)│  │Functions │  │  (S3)   │ │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Cron Jobs

| Job | Schedule | Function |
|-----|----------|----------|
| `proposal-automation-daily` | 09:00 UTC | Sends follow-up emails, marks stale |

### Monitoring

| Tool | Purpose |
|------|---------|
| Sentry | Frontend error tracking |
| Supabase Dashboard | Database logs, Edge Function logs |
| Resend Dashboard | Email delivery status |

---

## Related Documentation

- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Full schema details
- [AUTH_FLOW.md](./AUTH_FLOW.md) - Authentication details
- [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) - API reference
