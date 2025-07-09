-- Database Performance Optimization: Fix Over-indexing on Proposals Table (Corrected)
-- Removing duplicate, redundant, and unused indexes while consolidating overlapping ones

-- 1. DROP duplicate and redundant indexes created across multiple migrations
DROP INDEX IF EXISTS public.idx_proposals_agent_portfolio_kwp; -- Single value optimization not needed
DROP INDEX IF EXISTS public.idx_proposals_unit_standard; -- Single value column, unnecessary
DROP INDEX IF EXISTS public.idx_proposals_agent_id; -- Redundant with composite indexes
DROP INDEX IF EXISTS public.idx_proposals_client_reference_id; -- Redundant with composite indexes  
DROP INDEX IF EXISTS public.idx_proposals_status; -- Redundant with composite indexes
DROP INDEX IF EXISTS public.idx_proposals_created_at; -- Redundant with composite indexes
DROP INDEX IF EXISTS public.idx_proposals_agent_status; -- Duplicate of enhanced version
DROP INDEX IF EXISTS public.idx_proposals_client_status; -- Duplicate of enhanced version
DROP INDEX IF EXISTS public.idx_proposals_invitation_token; -- Duplicate, keeping enhanced version
DROP INDEX IF EXISTS public.idx_proposals_agent_deleted; -- Redundant with enhanced versions
DROP INDEX IF EXISTS public.idx_proposals_client_deleted; -- Redundant with enhanced versions
DROP INDEX IF EXISTS public.idx_proposals_agent_active; -- Redundant with enhanced versions
DROP INDEX IF EXISTS public.idx_proposals_client_active; -- Redundant with enhanced versions
DROP INDEX IF EXISTS public.idx_proposals_token; -- Duplicate naming
DROP INDEX IF EXISTS public.idx_proposals_updated_at; -- Rarely used for queries

-- Remove any remaining duplicate enhanced indexes from previous migrations
DROP INDEX IF EXISTS public.idx_proposals_agent_status_created;
DROP INDEX IF EXISTS public.idx_proposals_agent_status_created_enhanced;
DROP INDEX IF EXISTS public.idx_proposals_client_access_optimized;
DROP INDEX IF EXISTS public.idx_proposals_status_search_covering;
DROP INDEX IF EXISTS public.idx_proposals_dashboard_stats;

-- 2. Create consolidated optimized indexes that cover multiple query patterns

-- Enhanced agent access index (covers agent_id, status, created_at queries)
-- This replaces multiple single-column indexes
CREATE INDEX IF NOT EXISTS idx_proposals_agent_optimized
ON proposals(agent_id, status, created_at DESC, deleted_at, archived_at)
WHERE deleted_at IS NULL;

-- Enhanced client access index (covers both client_id and client_reference_id patterns)
CREATE INDEX IF NOT EXISTS idx_proposals_client_optimized  
ON proposals(client_id, client_reference_id, status, created_at DESC)
WHERE deleted_at IS NULL;

-- Invitation token index (optimized for token validation)
CREATE INDEX IF NOT EXISTS idx_proposals_invitation_optimized
ON proposals(invitation_token, invitation_expires_at)
WHERE invitation_token IS NOT NULL;

-- Dashboard stats covering index (for performance metrics)
CREATE INDEX IF NOT EXISTS idx_proposals_dashboard_optimized
ON proposals(agent_id, status, deleted_at, archived_at, signed_at)
INCLUDE (carbon_credits, client_share_percentage, system_size_kwp, annual_energy)
WHERE deleted_at IS NULL;

-- Search and filter covering index (for proposals list queries)
CREATE INDEX IF NOT EXISTS idx_proposals_search_optimized
ON proposals(agent_id, client_id, client_reference_id, status, deleted_at, archived_at)
INCLUDE (id, title, created_at, invitation_sent_at, invitation_viewed_at)
WHERE deleted_at IS NULL;

-- 3. Add comments for documentation
COMMENT ON INDEX idx_proposals_agent_optimized IS 'Optimized index for agent-based proposal queries covering status, date, and soft-delete filtering';
COMMENT ON INDEX idx_proposals_client_optimized IS 'Optimized index for client-based proposal queries covering both client_id and client_reference_id patterns';
COMMENT ON INDEX idx_proposals_invitation_optimized IS 'Optimized index for invitation token validation with expiration filtering';
COMMENT ON INDEX idx_proposals_dashboard_optimized IS 'Covering index for dashboard statistics with included columns for metrics calculation';
COMMENT ON INDEX idx_proposals_search_optimized IS 'Covering index for proposal list queries with included display columns';