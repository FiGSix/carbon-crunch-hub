-- =============================================================================
-- Partner API v1 - Foundation Schema
-- Phase 1: Partners, API Keys, Webhooks, Logs
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Partners table (one partner org, multiple API keys)
-- -----------------------------------------------------------------------------
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_email text NOT NULL,
  logo_url text,                          -- For email co-branding (max 120x40px)
  support_email text,                     -- Shown in email footer
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partners
CREATE POLICY "Admins can manage partners"
  ON public.partners FOR ALL
  USING (is_current_user_admin());

-- -----------------------------------------------------------------------------
-- 2. Partner API Keys table
-- -----------------------------------------------------------------------------
CREATE TABLE public.partner_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  
  api_key_hash text NOT NULL,             -- bcrypt hash (never store plain)
  api_key_prefix text NOT NULL,           -- "cc_live_abc" for identification
  environment text NOT NULL DEFAULT 'test', -- 'live' or 'test'
  
  scopes jsonb NOT NULL DEFAULT '["proposals:create", "proposals:read", "proposals:send", "projects:read", "projects:onboarding:write"]'::jsonb,
  
  rate_limit_per_minute int DEFAULT 100,
  rate_limit_per_day int DEFAULT 10000,
  
  is_active boolean DEFAULT true,
  last_used_at timestamptz,
  request_count bigint DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- Indexes
CREATE INDEX idx_partner_api_keys_prefix ON public.partner_api_keys(api_key_prefix);
CREATE INDEX idx_partner_api_keys_partner ON public.partner_api_keys(partner_id);

-- Enable RLS
ALTER TABLE public.partner_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partner_api_keys
CREATE POLICY "Admins can manage partner API keys"
  ON public.partner_api_keys FOR ALL
  USING (is_current_user_admin());

-- -----------------------------------------------------------------------------
-- 3. Partner Webhook Subscriptions table
-- -----------------------------------------------------------------------------
CREATE TABLE public.partner_webhook_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  
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

-- Index
CREATE INDEX idx_partner_webhooks_partner ON public.partner_webhook_subscriptions(partner_id);

-- Enable RLS
ALTER TABLE public.partner_webhook_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partner_webhook_subscriptions
CREATE POLICY "Admins can manage partner webhooks"
  ON public.partner_webhook_subscriptions FOR ALL
  USING (is_current_user_admin());

-- -----------------------------------------------------------------------------
-- 4. Partner Webhook Deliveries table
-- -----------------------------------------------------------------------------
CREATE TABLE public.partner_webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.partner_webhook_subscriptions(id) ON DELETE CASCADE,
  
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

-- Index
CREATE INDEX idx_webhook_deliveries_webhook ON public.partner_webhook_deliveries(webhook_id, created_at DESC);
CREATE INDEX idx_webhook_deliveries_status ON public.partner_webhook_deliveries(status, next_retry_at) 
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.partner_webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partner_webhook_deliveries
CREATE POLICY "Admins can view webhook deliveries"
  ON public.partner_webhook_deliveries FOR SELECT
  USING (is_current_user_admin());

CREATE POLICY "System can insert webhook deliveries"
  ON public.partner_webhook_deliveries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update webhook deliveries"
  ON public.partner_webhook_deliveries FOR UPDATE
  USING (true);

-- -----------------------------------------------------------------------------
-- 5. Partner API Logs table
-- -----------------------------------------------------------------------------
CREATE TABLE public.partner_api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.partners(id),
  api_key_id uuid REFERENCES public.partner_api_keys(id),
  
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

-- Indexes
CREATE INDEX idx_partner_api_logs_partner ON public.partner_api_logs(partner_id, created_at DESC);
CREATE INDEX idx_partner_api_logs_request ON public.partner_api_logs(request_id);
CREATE INDEX idx_partner_api_logs_created ON public.partner_api_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.partner_api_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partner_api_logs
CREATE POLICY "Admins can view API logs"
  ON public.partner_api_logs FOR SELECT
  USING (is_current_user_admin());

CREATE POLICY "System can insert API logs"
  ON public.partner_api_logs FOR INSERT
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 6. Column additions to proposals table
-- -----------------------------------------------------------------------------
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.partners(id);
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS partner_reference_id text;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS consent_obtained_at timestamptz;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS consent_source text;

-- Unique constraint for partner reference (one partner cannot reuse reference IDs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_proposals_partner_reference 
  ON public.proposals(partner_id, partner_reference_id) 
  WHERE partner_id IS NOT NULL AND partner_reference_id IS NOT NULL;

-- Index for partner lookups
CREATE INDEX IF NOT EXISTS idx_proposals_partner 
  ON public.proposals(partner_id) 
  WHERE partner_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 7. Column additions to project_onboarding table (for optimistic concurrency)
-- -----------------------------------------------------------------------------
ALTER TABLE public.project_onboarding ADD COLUMN IF NOT EXISTS version int DEFAULT 1;

-- Trigger to increment version on update (for ETag support)
CREATE OR REPLACE FUNCTION public.increment_project_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version := COALESCE(OLD.version, 0) + 1;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS project_onboarding_version ON public.project_onboarding;
CREATE TRIGGER project_onboarding_version
  BEFORE UPDATE ON public.project_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.increment_project_version();

-- -----------------------------------------------------------------------------
-- 8. Column additions to data_access_config table
-- -----------------------------------------------------------------------------
ALTER TABLE public.data_access_config ADD COLUMN IF NOT EXISTS granted_by_email text;
ALTER TABLE public.data_access_config ADD COLUMN IF NOT EXISTS granted_by_role text;

-- -----------------------------------------------------------------------------
-- 9. Column additions to onboarding_documents table
-- -----------------------------------------------------------------------------
ALTER TABLE public.onboarding_documents ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- -----------------------------------------------------------------------------
-- 10. Helper function: Validate partner API key and return partner info
-- Used by edge functions (bypasses RLS with SECURITY DEFINER)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_partner_api_key(p_api_key_prefix text)
RETURNS TABLE (
  partner_id uuid,
  api_key_id uuid,
  api_key_hash text,
  environment text,
  scopes jsonb,
  rate_limit_per_minute int,
  rate_limit_per_day int,
  partner_name text,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id as partner_id,
    k.id as api_key_id,
    k.api_key_hash,
    k.environment,
    k.scopes,
    k.rate_limit_per_minute,
    k.rate_limit_per_day,
    p.name as partner_name,
    (p.is_active AND k.is_active AND (k.expires_at IS NULL OR k.expires_at > now())) as is_active
  FROM public.partner_api_keys k
  JOIN public.partners p ON p.id = k.partner_id
  WHERE k.api_key_prefix = p_api_key_prefix
  LIMIT 1;
$$;

-- -----------------------------------------------------------------------------
-- 11. Helper function: Update API key usage stats
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_partner_api_key_usage(p_api_key_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.partner_api_keys
  SET 
    last_used_at = now(),
    request_count = COALESCE(request_count, 0) + 1
  WHERE id = p_api_key_id;
$$;

-- -----------------------------------------------------------------------------
-- 12. Helper function: Check for duplicate proposals (fuzzy match)
-- Returns matching proposals for dedup detection
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_proposal_duplicates(
  p_partner_id uuid,
  p_client_email text,
  p_address text,
  p_commissioning_date date
)
RETURNS TABLE (
  proposal_id uuid,
  status text,
  created_at timestamptz,
  partner_reference_id text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pr.id as proposal_id,
    pr.status,
    pr.created_at,
    pr.partner_reference_id
  FROM public.proposals pr
  JOIN public.clients c ON c.id = pr.client_reference_id
  WHERE 
    pr.partner_id = p_partner_id
    AND LOWER(c.email) = LOWER(p_client_email)
    AND pr.deleted_at IS NULL
    AND (
      -- Check for similar address (case insensitive contains)
      (pr.project_info->>'address') ILIKE '%' || p_address || '%'
      OR p_address ILIKE '%' || (pr.project_info->>'address') || '%'
    )
  ORDER BY pr.created_at DESC
  LIMIT 5;
$$;

-- -----------------------------------------------------------------------------
-- 13. Helper function: Get partner info for email attribution
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_partner_attribution(p_partner_id uuid)
RETURNS TABLE (
  partner_name text,
  logo_url text,
  support_email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    name as partner_name,
    logo_url,
    support_email
  FROM public.partners
  WHERE id = p_partner_id AND is_active = true;
$$;