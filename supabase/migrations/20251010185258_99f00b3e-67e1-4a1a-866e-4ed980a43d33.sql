-- Project Onboarding Feature Schema
-- This migration creates all tables, functions, triggers, and RLS policies for the project onboarding workspace

-- ============================================================================
-- TABLES
-- ============================================================================

-- Main project onboarding tracker
CREATE TABLE public.project_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL UNIQUE REFERENCES proposals(id) ON DELETE CASCADE,
  
  -- Meta
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_modified_by UUID REFERENCES profiles(id),
  
  -- Step Status (computed from validations)
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  data_access_verified BOOLEAN NOT NULL DEFAULT false,
  audit_ready BOOLEAN NOT NULL DEFAULT false,
  audit_ready_marked_by UUID REFERENCES profiles(id),
  audit_ready_marked_at TIMESTAMPTZ,
  
  -- Timestamps for each step
  onboarding_completed_at TIMESTAMPTZ,
  data_access_verified_at TIMESTAMPTZ,
  
  -- Assignments
  assigned_epc_id UUID REFERENCES profiles(id)
);

CREATE INDEX idx_project_onboarding_proposal_id ON project_onboarding(proposal_id);
CREATE INDEX idx_project_onboarding_status ON project_onboarding(onboarding_complete, data_access_verified, audit_ready);

-- Onboarding fields (mirrors BulkImportTemplate_v2.xlsx)
CREATE TABLE public.onboarding_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES project_onboarding(id) ON DELETE CASCADE,
  
  -- System Details
  system_address TEXT,
  system_gps_lat NUMERIC(10, 8),
  system_gps_lng NUMERIC(11, 8),
  commissioning_date DATE,
  
  -- Inverter Details
  inverter_model TEXT,
  inverter_capacity_kw NUMERIC(10, 2),
  inverter_serial TEXT,
  inverter_cost NUMERIC(12, 2),
  
  -- Battery Details (optional)
  battery_model TEXT,
  battery_capacity_kwh NUMERIC(10, 2),
  battery_serial TEXT,
  battery_cost NUMERIC(12, 2),
  
  -- Panel Details
  panel_brand TEXT,
  panel_size_wp NUMERIC(10, 2),
  panel_quantity INTEGER,
  panel_cost NUMERIC(12, 2),
  
  -- Financial
  total_capex NUMERIC(12, 2),
  labor_cost NUMERIC(12, 2),
  
  -- Metering
  meter_serial TEXT,
  meter_type TEXT,
  
  -- O&M
  maintenance_agreement_term_years INTEGER,
  maintenance_cost_annual NUMERIC(12, 2),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_onboarding_fields_project ON onboarding_fields(project_id);

-- Onboarding documents with versioning
CREATE TABLE public.onboarding_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project_onboarding(id) ON DELETE CASCADE,
  
  -- File Info
  category TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  
  -- Versioning
  version INTEGER NOT NULL DEFAULT 1,
  replaces_doc_id UUID REFERENCES onboarding_documents(id),
  
  -- Upload Info
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Validation
  is_validated BOOLEAN DEFAULT false,
  validated_by UUID REFERENCES profiles(id),
  validated_at TIMESTAMPTZ,
  validation_notes TEXT
);

CREATE INDEX idx_onboarding_documents_project ON onboarding_documents(project_id);
CREATE INDEX idx_onboarding_documents_category ON onboarding_documents(category);

-- Data access configuration
CREATE TABLE public.data_access_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES project_onboarding(id) ON DELETE CASCADE,
  
  -- Provider Info
  provider TEXT NOT NULL,
  site_id TEXT,
  portal_url TEXT,
  
  -- Credentials Method
  credential_method TEXT NOT NULL,
  delegated_email TEXT,
  api_key_encrypted TEXT,
  readonly_username TEXT,
  
  -- Connection Testing
  last_test_status TEXT,
  last_test_at TIMESTAMPTZ,
  last_test_error TEXT,
  first_data_ingested_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  configured_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_data_access_config_project ON data_access_config(project_id);

-- Onboarding tasks
CREATE TABLE public.onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project_onboarding(id) ON DELETE CASCADE,
  
  -- Task Info
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  related_field TEXT,
  related_doc_category TEXT,
  
  -- Assignment
  assigned_to UUID REFERENCES profiles(id),
  assigned_by UUID REFERENCES profiles(id),
  due_date DATE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'open',
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_onboarding_tasks_project ON onboarding_tasks(project_id);
CREATE INDEX idx_onboarding_tasks_assigned_to ON onboarding_tasks(assigned_to);
CREATE INDEX idx_onboarding_tasks_status ON onboarding_tasks(status);

-- Activity log (immutable)
CREATE TABLE public.onboarding_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project_onboarding(id) ON DELETE CASCADE,
  
  -- Activity Info
  actor_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  
  -- Details
  details JSONB NOT NULL DEFAULT '{}',
  old_value TEXT,
  new_value TEXT,
  
  -- Mentions
  mentioned_users UUID[],
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET
);

CREATE INDEX idx_activity_log_project ON onboarding_activity_log(project_id);
CREATE INDEX idx_activity_log_created_at ON onboarding_activity_log(created_at DESC);
CREATE INDEX idx_activity_log_mentioned ON onboarding_activity_log USING GIN(mentioned_users);

-- Comments
CREATE TABLE public.onboarding_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project_onboarding(id) ON DELETE CASCADE,
  
  -- Comment Info
  author_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  mentioned_users UUID[],
  
  -- Threading
  parent_comment_id UUID REFERENCES onboarding_comments(id),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  edited_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_comments_project ON onboarding_comments(project_id);
CREATE INDEX idx_comments_created_at ON onboarding_comments(created_at DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.project_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_access_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_comments ENABLE ROW LEVEL SECURITY;

-- project_onboarding policies
CREATE POLICY "Clients can view own onboarding"
ON project_onboarding FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = project_onboarding.proposal_id
    AND (p.client_id = auth.uid() OR p.client_reference_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Agents can view assigned onboarding"
ON project_onboarding FOR SELECT
USING (
  is_current_user_agent() AND EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = project_onboarding.proposal_id
    AND p.agent_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all onboarding"
ON project_onboarding FOR SELECT
USING (is_current_user_admin());

CREATE POLICY "Stakeholders can update onboarding"
ON project_onboarding FOR UPDATE
USING (
  is_current_user_admin() OR
  EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = project_onboarding.proposal_id
    AND (
      p.agent_id = auth.uid() OR
      p.client_id = auth.uid() OR
      p.client_reference_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    )
  )
);

CREATE POLICY "System can insert onboarding"
ON project_onboarding FOR INSERT
WITH CHECK (true);

-- onboarding_fields policies
CREATE POLICY "Users can view project fields"
ON onboarding_fields FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE po.id = onboarding_fields.project_id
    AND (
      p.client_id = auth.uid() OR
      p.agent_id = auth.uid() OR
      p.client_reference_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR
      is_current_user_admin()
    )
  )
);

CREATE POLICY "Stakeholders can update fields"
ON onboarding_fields FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE po.id = onboarding_fields.project_id
    AND (
      p.client_id = auth.uid() OR
      p.agent_id = auth.uid() OR
      p.client_reference_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR
      is_current_user_admin()
    )
  )
);

-- onboarding_documents policies
CREATE POLICY "Users can view documents"
ON onboarding_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE po.id = onboarding_documents.project_id
    AND (
      p.client_id = auth.uid() OR
      p.agent_id = auth.uid() OR
      p.client_reference_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR
      is_current_user_admin()
    )
  )
);

CREATE POLICY "Stakeholders can manage documents"
ON onboarding_documents FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE po.id = onboarding_documents.project_id
    AND (
      p.client_id = auth.uid() OR
      p.agent_id = auth.uid() OR
      p.client_reference_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR
      is_current_user_admin()
    )
  )
);

-- data_access_config policies (similar pattern)
CREATE POLICY "Users can view data access config"
ON data_access_config FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE po.id = data_access_config.project_id
    AND (
      p.client_id = auth.uid() OR
      p.agent_id = auth.uid() OR
      p.client_reference_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR
      is_current_user_admin()
    )
  )
);

CREATE POLICY "Stakeholders can manage data access"
ON data_access_config FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE po.id = data_access_config.project_id
    AND (
      p.client_id = auth.uid() OR
      p.agent_id = auth.uid() OR
      p.client_reference_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR
      is_current_user_admin()
    )
  )
);

-- onboarding_tasks policies
CREATE POLICY "Users can view tasks"
ON onboarding_tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE po.id = onboarding_tasks.project_id
    AND (
      p.client_id = auth.uid() OR
      p.agent_id = auth.uid() OR
      p.client_reference_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR
      is_current_user_admin()
    )
  )
);

CREATE POLICY "Admins can create tasks"
ON onboarding_tasks FOR INSERT
WITH CHECK (is_current_user_admin());

CREATE POLICY "Assigned users can update tasks"
ON onboarding_tasks FOR UPDATE
USING (assigned_to = auth.uid() OR is_current_user_admin());

-- onboarding_activity_log policies (read-only for users, insert-only)
CREATE POLICY "Users can view activity log"
ON onboarding_activity_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE po.id = onboarding_activity_log.project_id
    AND (
      p.client_id = auth.uid() OR
      p.agent_id = auth.uid() OR
      p.client_reference_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR
      is_current_user_admin()
    )
  )
);

CREATE POLICY "System can insert activity"
ON onboarding_activity_log FOR INSERT
WITH CHECK (true);

-- onboarding_comments policies
CREATE POLICY "Users can view comments"
ON onboarding_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE po.id = onboarding_comments.project_id
    AND (
      p.client_id = auth.uid() OR
      p.agent_id = auth.uid() OR
      p.client_reference_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR
      is_current_user_admin()
    )
  )
);

CREATE POLICY "Users can create comments"
ON onboarding_comments FOR INSERT
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors can update own comments"
ON onboarding_comments FOR UPDATE
USING (author_id = auth.uid());

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-create onboarding record after signature
CREATE OR REPLACE FUNCTION create_onboarding_on_signature()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.signed_at IS NULL AND NEW.signed_at IS NOT NULL THEN
    INSERT INTO project_onboarding (proposal_id)
    VALUES (NEW.id)
    ON CONFLICT (proposal_id) DO NOTHING;
    
    INSERT INTO onboarding_fields (project_id)
    SELECT id FROM project_onboarding WHERE proposal_id = NEW.id
    ON CONFLICT (project_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_onboarding
AFTER UPDATE ON proposals
FOR EACH ROW
EXECUTE FUNCTION create_onboarding_on_signature();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_onboarding_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_onboarding_timestamp
BEFORE UPDATE ON project_onboarding
FOR EACH ROW
EXECUTE FUNCTION update_onboarding_timestamp();

CREATE TRIGGER trigger_update_fields_timestamp
BEFORE UPDATE ON onboarding_fields
FOR EACH ROW
EXECUTE FUNCTION update_onboarding_timestamp();

CREATE TRIGGER trigger_update_data_access_timestamp
BEFORE UPDATE ON data_access_config
FOR EACH ROW
EXECUTE FUNCTION update_onboarding_timestamp();

-- Validate onboarding completion
CREATE OR REPLACE FUNCTION validate_onboarding_completion(project_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  required_fields_complete BOOLEAN;
  required_docs_present BOOLEAN;
BEGIN
  SELECT (
    system_address IS NOT NULL AND
    commissioning_date IS NOT NULL AND
    inverter_model IS NOT NULL AND
    inverter_serial IS NOT NULL AND
    panel_brand IS NOT NULL AND
    total_capex > 0
  ) INTO required_fields_complete
  FROM onboarding_fields
  WHERE project_id = project_id_param;
  
  SELECT (
    EXISTS(SELECT 1 FROM onboarding_documents WHERE project_id = project_id_param AND category = 'coc') AND
    EXISTS(SELECT 1 FROM onboarding_documents WHERE project_id = project_id_param AND category = 'invoice')
  ) INTO required_docs_present;
  
  RETURN COALESCE(required_fields_complete, false) AND COALESCE(required_docs_present, false);
END;
$$;

-- Get project step status for UI pills
CREATE OR REPLACE FUNCTION get_project_step_status(proposal_id_param UUID)
RETURNS TABLE(
  cession_status TEXT,
  onboarding_status TEXT,
  data_access_status TEXT,
  audit_ready_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    'green'::TEXT as cession_status,
    CASE 
      WHEN po.onboarding_complete THEN 'green'
      ELSE 'orange'
    END as onboarding_status,
    CASE
      WHEN po.data_access_verified AND dac.first_data_ingested_at IS NOT NULL THEN 'green'
      ELSE 'orange'
    END as data_access_status,
    CASE
      WHEN po.audit_ready THEN 'green'
      ELSE 'orange'
    END as audit_ready_status
  FROM project_onboarding po
  LEFT JOIN data_access_config dac ON dac.project_id = po.id
  WHERE po.proposal_id = proposal_id_param;
END;
$$;

-- Migrate existing signed proposals
INSERT INTO project_onboarding (proposal_id)
SELECT id FROM proposals WHERE signed_at IS NOT NULL
ON CONFLICT (proposal_id) DO NOTHING;

INSERT INTO onboarding_fields (project_id)
SELECT id FROM project_onboarding
ON CONFLICT (project_id) DO NOTHING;