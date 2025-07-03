-- Phase 3: Database & Query Optimization
-- Add performance indexes for critical queries

-- Proposals table indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_proposals_agent_status_created 
ON proposals(agent_id, status, created_at DESC) 
WHERE deleted_at IS NULL AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_proposals_client_status 
ON proposals(client_id, status) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_proposals_client_ref_status 
ON proposals(client_reference_id, status) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_proposals_invitation_token 
ON proposals(invitation_token) 
WHERE invitation_token IS NOT NULL;

-- Clients table indexes for search and agent relationships
CREATE INDEX IF NOT EXISTS idx_clients_created_by_email 
ON clients(created_by, email);

CREATE INDEX IF NOT EXISTS idx_clients_user_id 
ON clients(user_id) 
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clients_email_search 
ON clients USING gin(to_tsvector('english', 
  COALESCE(first_name, '') || ' ' || 
  COALESCE(last_name, '') || ' ' || 
  COALESCE(email, '') || ' ' || 
  COALESCE(company_name, '')
));

-- Profiles table indexes for role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role_email 
ON profiles(role, email);

-- Notifications table indexes for user queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
ON notifications(user_id, read, created_at DESC);

-- System settings indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key 
ON system_settings(setting_key);