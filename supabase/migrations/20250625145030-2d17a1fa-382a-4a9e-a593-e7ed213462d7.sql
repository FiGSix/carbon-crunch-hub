
-- Phase 2 Database Cleanup: Add missing foreign key constraints first
-- Part 1: Foreign key constraints and basic setup

-- Add missing foreign key constraints that weren't properly established
DO $$
BEGIN
    -- Add foreign key for proposals.agent_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'proposals_agent_id_fkey' 
        AND table_name = 'proposals'
    ) THEN
        ALTER TABLE proposals 
        ADD CONSTRAINT proposals_agent_id_fkey 
        FOREIGN KEY (agent_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key for proposals.client_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'proposals_client_id_fkey' 
        AND table_name = 'proposals'
    ) THEN
        ALTER TABLE proposals 
        ADD CONSTRAINT proposals_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;

    -- Add foreign key for clients.user_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'clients_user_id_fkey' 
        AND table_name = 'clients'
    ) THEN
        ALTER TABLE clients 
        ADD CONSTRAINT clients_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create performance indexes for frequently queried columns (without CONCURRENTLY)
CREATE INDEX IF NOT EXISTS idx_proposals_agent_id ON proposals(agent_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client_reference_id ON proposals(client_reference_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Add email uniqueness constraint to clients table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'clients_email_unique' 
        AND table_name = 'clients'
    ) THEN
        ALTER TABLE clients 
        ADD CONSTRAINT clients_email_unique UNIQUE (email);
    END IF;
END $$;

-- Add audit columns to track data changes
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_modified_by uuid REFERENCES profiles(id);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS last_modified_by uuid REFERENCES profiles(id);

-- Create function to automatically update modification tracking
CREATE OR REPLACE FUNCTION update_modified_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  NEW.last_modified_by = auth.uid();
  RETURN NEW;
END;
$function$;

-- Add triggers for automatic modification tracking
DROP TRIGGER IF EXISTS update_clients_modified ON clients;
CREATE TRIGGER update_clients_modified
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_modified_columns();

DROP TRIGGER IF EXISTS update_proposals_modified ON proposals;
CREATE TRIGGER update_proposals_modified
  BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_modified_columns();

-- Update RLS policies to be more efficient and use the new indexes
DROP POLICY IF EXISTS "Enhanced agents can view clients" ON clients;
CREATE POLICY "Enhanced agents can view clients" ON clients
FOR SELECT USING (
  get_current_user_role() = 'admin' OR
  (get_current_user_role() = 'agent' AND (
    created_by = auth.uid() OR
    EXISTS(
      SELECT 1 FROM proposals p 
      WHERE p.client_reference_id = clients.id 
      AND p.agent_id = auth.uid()
    )
  )) OR
  user_id = auth.uid()
);

-- Optimize the get_agent_clients function for better performance
CREATE OR REPLACE FUNCTION public.get_agent_clients_optimized(agent_id_param uuid DEFAULT NULL::uuid)
RETURNS TABLE(
  client_id uuid, 
  client_name text, 
  client_email text, 
  company_name text, 
  is_registered boolean, 
  project_count bigint, 
  total_mwp numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  WITH client_proposals AS (
    SELECT 
      COALESCE(p.client_reference_id, p.client_id) as client_ref_id,
      COUNT(*) as project_count,
      SUM(COALESCE(p.system_size_kwp, p.annual_energy / 1000.0, 0)) as total_kwp
    FROM proposals p
    WHERE p.deleted_at IS NULL
      AND p.archived_at IS NULL
      AND (agent_id_param IS NULL OR p.agent_id = agent_id_param)
      AND COALESCE(p.client_reference_id, p.client_id) IS NOT NULL
    GROUP BY COALESCE(p.client_reference_id, p.client_id)
  )
  SELECT 
    c.id as client_id,
    TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) as client_name,
    c.email as client_email,
    COALESCE(c.company_name, '') as company_name,
    CASE WHEN c.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_registered,
    COALESCE(cp.project_count, 0) as project_count,
    COALESCE(cp.total_kwp / 1000.0, 0) as total_mwp
  FROM clients c
  LEFT JOIN client_proposals cp ON c.id = cp.client_ref_id
  WHERE cp.client_ref_id IS NOT NULL
    AND c.email IS NOT NULL
    AND TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) != ''
  ORDER BY client_name;
END;
$function$;
