# Developer Handover Documentation

**Project:** Carbon Credit Proposal Management Platform  
**Domain:** Solar PV Carbon Credits (South Africa)  
**Last Updated:** January 2026

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Quick Start Guide](#quick-start-guide)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Key Documentation](#key-documentation)
6. [Critical Business Logic](#critical-business-logic)
7. [Common Tasks](#common-tasks)
8. [Contacts & Resources](#contacts--resources)

---

## Executive Summary

This platform manages the lifecycle of carbon credit proposals for solar PV installations in South Africa. It connects three user roles:

| Role | Description |
|------|-------------|
| **Admin** | Platform administrators with full access |
| **Agent** | Sales agents who create proposals and manage client relationships |
| **Client** | End clients who sign proposals and complete project onboarding |

### Core Business Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Agent     │───▶│  Proposal   │───▶│   Client    │───▶│  Onboarding │
│  Creates    │    │    Sent     │    │   Signs     │    │   Complete  │
│  Proposal   │    │  via Email  │    │  Agreement  │    │    (Audit)  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Revenue Model

1. Solar installations generate carbon credits based on energy production
2. Credits are sold at dynamic annual pricing
3. Revenue is split between:
   - **Client** (60-70% based on portfolio size)
   - **Platform** (remainder minus agent commission)
   - **Agent** (4-7% based on portfolio size)

---

## Quick Start Guide

### Prerequisites

- Node.js 18+
- npm or bun
- Supabase CLI (optional, for local development)

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Environment Variables

The application uses Supabase environment variables configured in `src/integrations/supabase/client.ts`. For Edge Functions, secrets are managed through Supabase Dashboard:

| Secret | Purpose |
|--------|---------|
| `RESEND_API_KEY` | Email delivery |
| `GOOGLE_MAPS_API_KEY` | Address autocomplete |
| `MAPBOX_ACCESS_TOKEN` | Geocoding fallback |

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI framework |
| Vite | 4.x | Build tool |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Styling |
| shadcn/ui | Latest | Component library |
| TanStack Query | 5.x | Server state management |
| React Router | 6.x | Client-side routing |
| Framer Motion | 12.x | Animations |

### Backend (Supabase)

| Service | Purpose |
|---------|---------|
| PostgreSQL | Database with RLS |
| Auth | User authentication |
| Edge Functions | Server-side logic (Deno) |
| Storage | File uploads (PDFs, documents) |
| Realtime | Live subscriptions |

### External Services

| Service | Purpose |
|---------|---------|
| Resend | Transactional emails |
| Sentry | Error monitoring |
| Google Maps | Address autocomplete |
| Mapbox | Geocoding |

---

## Project Structure

```
├── docs/                          # Documentation
│   ├── DEVELOPER_HANDOVER.md      # This file
│   ├── ARCHITECTURE.md            # System architecture
│   ├── DATABASE_SCHEMA.md         # Database documentation
│   ├── AUTH_FLOW.md               # Authentication details
│   ├── CARBON_CALCULATIONS.md     # Business logic
│   ├── EDGE_FUNCTIONS.md          # API reference
│   └── TROUBLESHOOTING.md         # Common issues
│
├── src/
│   ├── components/                # React components
│   │   ├── admin/                 # Admin-specific components
│   │   ├── agents/                # Agent management
│   │   ├── clients/               # Client management
│   │   ├── dashboard/             # Dashboard widgets
│   │   ├── layout/                # App layout components
│   │   ├── onboarding/            # Project onboarding
│   │   ├── proposals/             # Proposal components
│   │   └── ui/                    # shadcn/ui components
│   │
│   ├── contexts/                  # React contexts
│   │   └── auth/                  # Authentication context
│   │
│   ├── hooks/                     # Custom React hooks
│   │   ├── dashboard/             # Dashboard data hooks
│   │   ├── proposals/             # Proposal operations
│   │   └── ...                    # Domain-specific hooks
│   │
│   ├── integrations/
│   │   └── supabase/              # Supabase client & types
│   │
│   ├── lib/
│   │   ├── supabase/              # Supabase utilities
│   │   │   ├── auth/              # Auth functions
│   │   │   └── profile/           # Profile operations
│   │   └── utils/                 # General utilities
│   │
│   ├── pages/                     # Route components
│   │   ├── Admin/                 # Admin pages
│   │   ├── Dashboard/             # Main dashboard
│   │   ├── ProposalAcceptance/    # Client signing flow
│   │   └── ...                    # Other pages
│   │
│   ├── services/                  # Business logic
│   │   ├── calculations/          # Carbon calculations
│   │   ├── proposal/              # Proposal services
│   │   └── unified/               # Data services
│   │
│   ├── types/                     # TypeScript definitions
│   └── utils/                     # Helper functions
│
├── supabase/
│   ├── functions/                 # 35+ Edge Functions
│   │   ├── send-proposal-invitation/
│   │   ├── accept-proposal/
│   │   ├── generate-proposal-pdf/
│   │   └── ...
│   │
│   └── migrations/                # 216+ SQL migrations
│
└── public/                        # Static assets
```

---

## Key Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, data flow diagrams |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | All tables, relationships, RLS policies |
| [AUTH_FLOW.md](./AUTH_FLOW.md) | Authentication, roles, authorization |
| [CARBON_CALCULATIONS.md](./CARBON_CALCULATIONS.md) | Revenue calculations, pricing tiers |
| [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) | API endpoints, request/response formats |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common issues and solutions |

---

## Critical Business Logic

### 1. Carbon Credit Calculation

Located in `src/services/calculations/carbon/`

```typescript
// Key formula
const annualEnergy = systemSizeKWp * 1600; // kWh per year
const carbonCredits = annualEnergy * 0.95 / 1000; // tonnes CO2
const revenue = carbonCredits * carbonPricePerTonne;
```

See [CARBON_CALCULATIONS.md](./CARBON_CALCULATIONS.md) for full details.

### 2. Proposal Status Flow

```
draft → sent → delivered → opened → viewed → accepted
                  ↓           ↓        ↓
               bounced      stale    stale (14 days)
```

### 3. Client Share Tiers (Portfolio-Based)

| Portfolio Size | Client Share |
|---------------|--------------|
| 0-5 MWp | 60.20% |
| 5-10 MWp | 63.00% |
| 10-20 MWp | 66.50% |
| 20-30 MWp | 68.25% |
| 30+ MWp | 70.00% |

---

## Common Tasks

### Adding a New Edge Function

1. Create folder: `supabase/functions/function-name/`
2. Add `index.ts` with Deno serve handler
3. Import shared types from `_shared/`
4. Deploy: Functions auto-deploy on push

### Modifying Database Schema

1. Create migration via Lovable or Supabase CLI
2. Include RLS policies for new tables
3. Update `src/integrations/supabase/types.ts` (auto-generated)

### Adding a New Page

1. Create component in `src/pages/`
2. Add route in `src/App.tsx`
3. Wrap with `PrivateRoute` if auth required
4. Add role check if role-specific

### Debugging Issues

1. Check browser console for errors
2. Check Supabase logs (Database → Logs)
3. Check Edge Function logs
4. See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## Contacts & Resources

### Key Resources

| Resource | URL |
|----------|-----|
| Supabase Dashboard | https://supabase.com/dashboard |
| Sentry Dashboard | https://sentry.io |
| Resend Dashboard | https://resend.com |
| Lovable Documentation | https://docs.lovable.dev |

### Codebase Conventions

- **Components**: PascalCase (`ProposalCard.tsx`)
- **Hooks**: camelCase with `use` prefix (`useProposals.ts`)
- **Services**: PascalCase classes (`UnifiedDataService.ts`)
- **Utils**: camelCase functions (`formatCurrency.ts`)
- **Types**: PascalCase interfaces (`ProposalListItem`)

### Important Notes

1. **RLS is Critical**: All tables have Row Level Security. Test queries as different user roles.

2. **Client Data Sync**: Proposals store client info snapshots in `content.clientInfo`, but always fetch live data from `clients` table.

3. **Edge Functions**: CORS headers are required. Use `_shared/cors.ts` helper.

4. **Cache Invalidation**: The caching system in `UnifiedDataService` needs explicit invalidation after mutations.

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| Jan 2026 | 1.0 | Initial handover documentation |
