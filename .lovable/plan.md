

# Invite Clients to Join the Platform

## Overview

Build a client invitation system modeled after the existing agent invitation flow (`agent_invitations` table + `send-agent-invitation` edge function), but adapted for client role signups. Any authenticated user (agent, client, or admin) can invite someone to join as a client.

## What Users See

- **Agents**: A new "Invite Client" button on their dashboard (or within their client management area) lets them invite prospects by email
- **Clients**: The existing "Refer a Client" section on their profile gets upgraded from a passive link to a proper email invitation with tracking
- **Admins**: Can invite clients from the admin user management page

The invited person receives a branded email with a registration link (`/register?role=client&token=...`). The invitation expires in 48 hours and is tracked in a new `client_invitations` table.

## Database

### New Table: `client_invitations`

Mirrors the `agent_invitations` table structure:

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID (PK) | Primary key |
| email | TEXT (unique) | Invitee email |
| first_name | TEXT | Optional first name |
| last_name | TEXT | Optional last name |
| company_name | TEXT | Optional company name |
| invitation_token | TEXT (unique) | 64-char secure token |
| invited_by | UUID (FK profiles) | Who sent the invite |
| status | TEXT | pending / accepted / expired |
| expires_at | TIMESTAMPTZ | 48-hour expiry |
| created_at | TIMESTAMPTZ | When created |

RLS policies:
- Authenticated users can INSERT (anyone can invite)
- Authenticated users can SELECT their own invitations (where `invited_by = auth.uid()`)
- Admins can SELECT all
- Anon can SELECT by token (for registration validation)
- Authenticated can UPDATE (for status changes)

A trigger will automatically mark invitations as `accepted` when a new client profile is created with a matching email.

### Registration Page Update

The existing `/register` page already accepts `?role=agent&token=...` for agent invitations. It needs to also handle `?role=client&token=...`, validating against the `client_invitations` table instead of `agent_invitations`.

## Edge Function: `send-client-invitation`

Modeled directly on `send-agent-invitation`, but:
- Any authenticated user can call it (not admin-only)
- Creates a record in `client_invitations` (not `agent_invitations`)
- Registration link points to `/register?role=client&token=...`
- Email template is client-focused (mentions monetising solar systems, carbon credits)
- Supports resend of pending invitations
- Checks for existing profiles and duplicate invitations

## Frontend Changes

### 1. Upgrade ClientReferralSection (for clients)

Replace the passive referral link with a proper invitation form:
- Email input field
- Optional first/last name fields
- "Send Invitation" button that calls `send-client-invitation`
- Shows list of pending invitations sent by this user
- Resend option for pending invitations

### 2. Agent "Invite Client" Button

Add an "Invite Client" action to the agent's client management area. This opens a dialog (reusing the same pattern as `InviteTeamMemberDialog`) that calls `send-client-invitation`.

### 3. Admin "Invite Client" Button

Add to the `UserManagementHeader` component, alongside any existing invite actions, a button to invite clients.

### 4. Registration Page Update

Update the registration flow to validate `client_invitations` tokens when `role=client` is in the URL params.

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/send-client-invitation/index.ts` | Edge function: validates auth, creates invitation record, sends branded email via Resend |
| `src/components/client/InviteClientDialog.tsx` | Reusable dialog component for inviting a client (email + optional name) |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/profile/ClientReferralSection.tsx` | Replace passive referral link with invitation form + pending invitations list |
| `src/components/layout/DashboardSidebar.tsx` | (Optional) Add "Invite Client" nav item for agents |
| `src/pages/Register.tsx` | Handle `role=client&token=...` by validating against `client_invitations` table |
| `src/components/admin/users/UserManagementHeader.tsx` | Add "Invite Client" button for admins |
| `supabase/config.toml` | Add `send-client-invitation` function config with `verify_jwt = false` |

## Database Migration

```sql
-- Create client_invitations table
CREATE TABLE public.client_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  invitation_token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES public.profiles(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_pending_client_email UNIQUE (email)
);

ALTER TABLE public.client_invitations ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can invite
CREATE POLICY "Authenticated users can insert client invitations"
  ON public.client_invitations FOR INSERT
  TO authenticated
  WITH CHECK (invited_by = auth.uid());

-- Users can see their own invitations
CREATE POLICY "Users can view own sent invitations"
  ON public.client_invitations FOR SELECT
  TO authenticated
  USING (invited_by = auth.uid());

-- Admins can see all
CREATE POLICY "Admins can view all client invitations"
  ON public.client_invitations FOR SELECT
  TO authenticated
  USING (public.is_current_user_admin());

-- Anon can validate tokens (for registration)
CREATE POLICY "Anon can validate pending client invitation tokens"
  ON public.client_invitations FOR SELECT
  TO anon
  USING (status = 'pending' AND expires_at > now());

-- Allow status updates
CREATE POLICY "System can update client invitations"
  ON public.client_invitations FOR UPDATE
  TO authenticated
  USING (true);

-- Indexes
CREATE INDEX idx_client_invitations_token ON public.client_invitations(invitation_token);
CREATE INDEX idx_client_invitations_email ON public.client_invitations(email);
CREATE INDEX idx_client_invitations_status ON public.client_invitations(status);
CREATE INDEX idx_client_invitations_invited_by ON public.client_invitations(invited_by);

-- Auto-accept invitation when client profile is created
CREATE OR REPLACE FUNCTION public.handle_client_invitation_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'client' THEN
    UPDATE public.client_invitations
    SET status = 'accepted'
    WHERE LOWER(email) = LOWER(NEW.email)
    AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_client_profile_created_accept_invitation
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_client_invitation_acceptance();
```

## Email Template

The invitation email will follow the same branded HTML template as agent invitations but with client-focused messaging:

- Header: "You're Invited!"
- Benefits: Monetise your solar system, earn carbon credits, track your projects, free to join
- CTA button: "Accept Invitation" linking to `/register?role=client&token=...`
- 48-hour expiry notice
- CrunchCarbon branding consistent with existing emails

