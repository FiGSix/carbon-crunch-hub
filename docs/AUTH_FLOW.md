# Authentication & Authorization

**Last Updated:** January 2026

---

## Table of Contents

1. [Overview](#overview)
2. [User Roles](#user-roles)
3. [Authentication Flows](#authentication-flows)
4. [Authorization System](#authorization-system)
5. [Session Management](#session-management)
6. [Frontend Implementation](#frontend-implementation)
7. [Security Considerations](#security-considerations)

---

## Overview

The platform uses Supabase Auth (GoTrue) for authentication, with custom role-based authorization implemented through database profiles and RLS policies.

### Authentication Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION LAYERS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  Supabase Auth (GoTrue)                    │  │
│  │  • Email/Password authentication                          │  │
│  │  • JWT token management                                   │  │
│  │  • Session refresh                                        │  │
│  │  • Password reset                                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   profiles Table                           │  │
│  │  • Role storage (admin, agent, client)                    │  │
│  │  • Extended user data                                     │  │
│  │  • Agent approval status                                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  Row Level Security                        │  │
│  │  • Per-table access policies                              │  │
│  │  • Role-based data filtering                              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## User Roles

### Role Definitions

| Role | Description | Access Level |
|------|-------------|--------------|
| `admin` | Platform administrators | Full system access |
| `agent` | Sales representatives | Own proposals, clients, team |
| `client` | End customers | Own proposals and projects |

### Role Assignment

Roles are determined at registration and stored in both:
1. `auth.users.user_metadata.role` - For JWT claims
2. `profiles.role` - For database queries

```typescript
// Role is set during registration
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      role: 'agent', // or 'client', 'admin'
      first_name: firstName,
      last_name: lastName,
    }
  }
});
```

### Agent Status Workflow

Agents require admin approval before full access:

```
Registration → pending_approval → approved/rejected
                     │
                     ▼
              AgentApprovalGuard
                     │
           ┌─────────┴─────────┐
           │                   │
     pending_approval      approved
           │                   │
           ▼                   ▼
    PendingApprovalPage   Full Dashboard
```

**Agent Status Values:**
- `pending_approval` - Awaiting admin review
- `approved` - Full access granted
- `rejected` - Access denied

---

## Authentication Flows

### Standard Registration

```
┌──────────────────────────────────────────────────────────────────┐
│                    REGISTRATION FLOW                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────┐    ┌─────────────┐    ┌─────────────┐              │
│  │ Register│───▶│ Supabase    │───▶│ Email       │              │
│  │  Form   │    │ signUp()    │    │ Verification│              │
│  └─────────┘    └─────────────┘    └──────┬──────┘              │
│                                           │                      │
│                                           ▼                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ handle_    │◀───│   Trigger   │◀───│ Verify Link │         │
│  │ new_user() │    │             │    │   Click     │         │
│  └──────┬──────┘    └─────────────┘    └─────────────┘         │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────┐    ┌─────────────┐                             │
│  │  Profile    │───▶│  Redirect   │                             │
│  │  Created    │    │  to App     │                             │
│  └─────────────┘    └─────────────┘                             │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Invitation-Based Registration

Used for agent team invitations and client team invitations:

```
┌──────────────────────────────────────────────────────────────────┐
│                 INVITATION REGISTRATION FLOW                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────┐    ┌─────────────┐    ┌─────────────┐              │
│  │ Email   │───▶│  /join?     │───▶│  Validate   │              │
│  │  Link   │    │  token=xxx  │    │   Token     │              │
│  └─────────┘    └─────────────┘    └──────┬──────┘              │
│                                           │                      │
│                 ┌─────────────────────────┴───────────┐         │
│                 │                                     │         │
│           Token Valid                           Token Invalid    │
│                 │                                     │         │
│                 ▼                                     ▼         │
│  ┌─────────────────────┐                  ┌─────────────────┐  │
│  │ Pre-fill form with  │                  │  Error message  │  │
│  │ invitation data     │                  │  Redirect home  │  │
│  └──────────┬──────────┘                  └─────────────────┘  │
│             │                                                   │
│             ▼                                                   │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │  Complete signup    │───▶│ Mark invitation     │            │
│  │  (enter password)   │    │ as accepted         │            │
│  └─────────────────────┘    └─────────────────────┘            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Token-Based Proposal Access

Clients can view/sign proposals without registration:

```
┌──────────────────────────────────────────────────────────────────┐
│                 TOKEN-BASED PROPOSAL ACCESS                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────┐    ┌─────────────────────┐                         │
│  │ Email   │───▶│ /proposal/accept?   │                         │
│  │  Link   │    │ token=xxx           │                         │
│  └─────────┘    └──────────┬──────────┘                         │
│                            │                                     │
│                            ▼                                     │
│                 ┌─────────────────────┐                         │
│                 │ get_proposal_by_    │                         │
│                 │ token() RPC         │                         │
│                 └──────────┬──────────┘                         │
│                            │                                     │
│             ┌──────────────┴──────────────┐                     │
│             │                             │                     │
│        Valid Token                  Invalid/Expired             │
│             │                             │                     │
│             ▼                             ▼                     │
│  ┌─────────────────────┐      ┌─────────────────────┐          │
│  │ Show proposal       │      │  Error message      │          │
│  │ Sign without login  │      │                     │          │
│  └──────────┬──────────┘      └─────────────────────┘          │
│             │                                                   │
│             ▼                                                   │
│  ┌─────────────────────┐                                       │
│  │ On signature:       │                                       │
│  │ • Create profile    │                                       │
│  │ • Link to client    │                                       │
│  │ • Start onboarding  │                                       │
│  └─────────────────────┘                                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Login Flow

```typescript
// Login implementation
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (error) {
  // Handle error
}

// Session is automatically managed
// Profile is fetched by AuthContext
```

### Password Reset Flow

```
Request Reset → Email Sent → Click Link → New Password Form → Updated
```

---

## Authorization System

### Route Protection

```tsx
// PrivateRoute component wraps authenticated routes
<Route
  path="/dashboard"
  element={
    <PrivateRoute>
      <DashboardLayout>
        <Dashboard />
      </DashboardLayout>
    </PrivateRoute>
  }
/>
```

### Role-Based Access

```tsx
// Check role in components
const { userRole } = useAuth();

if (userRole === 'admin') {
  // Show admin features
}

// Conditional rendering
{userRole === 'admin' && <AdminControls />}
```

### Agent Approval Guard

```tsx
// AgentApprovalGuard wraps agent routes
<AgentApprovalGuard>
  <AgentDashboard />
</AgentApprovalGuard>

// Shows PendingApprovalPage if agent_status !== 'approved'
```

### Database-Level Authorization (RLS)

```sql
-- Example: Agents can only see own proposals
CREATE POLICY "Agents view own proposals"
ON proposals FOR SELECT
USING (
  agent_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Clients see proposals linked to them
CREATE POLICY "Clients view own proposals"
ON proposals FOR SELECT
USING (
  client_id = auth.uid()
  OR
  client_reference_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  )
);
```

---

## Session Management

### Session Lifecycle

```
┌──────────────────────────────────────────────────────────────────┐
│                    SESSION LIFECYCLE                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Login                                                           │
│    │                                                              │
│    ▼                                                              │
│  ┌─────────────────────┐                                         │
│  │ JWT Token Created   │ ◀─── Access Token (1 hour)              │
│  │ Refresh Token       │ ◀─── Refresh Token (7 days)             │
│  └──────────┬──────────┘                                         │
│             │                                                     │
│             ▼                                                     │
│  ┌─────────────────────┐                                         │
│  │ AuthContext stores  │                                         │
│  │ user + profile      │                                         │
│  └──────────┬──────────┘                                         │
│             │                                                     │
│             ├─────────────────────────────────────┐              │
│             │                                     │              │
│             ▼                                     ▼              │
│  ┌─────────────────────┐              ┌─────────────────────┐   │
│  │ Token Expiring      │              │ Page Reload         │   │
│  │ Auto-refresh        │              │ Session restored    │   │
│  └─────────────────────┘              └─────────────────────┘   │
│                                                                   │
│  Logout / Token Invalid                                          │
│    │                                                              │
│    ▼                                                              │
│  ┌─────────────────────┐                                         │
│  │ Clear local state   │                                         │
│  │ Redirect to login   │                                         │
│  └─────────────────────┘                                         │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Session Refresh

```typescript
// Automatic session refresh in AuthContext
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    // Session was automatically refreshed
  }
  
  if (event === 'SIGNED_OUT') {
    // Clear local state
    setUser(null);
    setProfile(null);
  }
});
```

---

## Frontend Implementation

### AuthContext

Location: `src/contexts/auth/AuthContext.tsx`

```typescript
interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  userRole: UserRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
```

### useAuth Hook

```typescript
// Using the auth hook
const { user, profile, userRole, loading, signOut } = useAuth();

// Check authentication
if (loading) {
  return <Loading />;
}

if (!user) {
  return <Redirect to="/login" />;
}

// Access user data
console.log(user.email);
console.log(profile?.first_name);
console.log(userRole); // 'admin' | 'agent' | 'client'
```

### Auth Functions

Location: `src/lib/supabase/auth/`

| Function | Purpose |
|----------|---------|
| `signUp()` | Register new user |
| `signIn()` | Authenticate user |
| `signOut()` | End session |
| `getCurrentUser()` | Get current auth user |
| `getUserRole()` | Get role from profile |
| `refreshSession()` | Refresh JWT token |

---

## Security Considerations

### Password Requirements

- Minimum 6 characters (Supabase default)
- Recommend enforcing stronger policy in UI

### Token Security

- JWT tokens stored in `localStorage`
- Tokens are automatically refreshed
- HTTPS required for all requests

### CSRF Protection

- Supabase handles CSRF via SameSite cookies
- No additional CSRF tokens needed

### Rate Limiting

- Supabase Auth has built-in rate limiting
- Custom rate limiting on Edge Functions recommended

### Security Headers

Recommended headers (configure in hosting):

```
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000
```

### Audit Logging

Client access is logged:

```sql
-- client_access_audit table tracks:
-- • Who accessed what client data
-- • What action was performed
-- • IP address and user agent
-- • Search terms used
```

---

## Common Issues

### "User not found" after signup

**Cause:** Email verification required  
**Solution:** Check email, click verification link

### Profile not created

**Cause:** `handle_new_user()` trigger failed  
**Solution:** Check Supabase logs, verify trigger exists

### Role mismatch

**Cause:** Role in profile differs from JWT  
**Solution:** Call `synchronizeUserRole()` to sync

### Session expired

**Cause:** Refresh token expired (7 days inactive)  
**Solution:** User must log in again

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Tables and RLS
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues
