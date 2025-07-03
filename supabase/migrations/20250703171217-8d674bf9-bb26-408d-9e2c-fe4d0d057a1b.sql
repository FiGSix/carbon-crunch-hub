-- Phase 1: Agent Management Database Schema
-- Add agent status and management fields to profiles table

-- Add agent-specific fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS agent_status TEXT DEFAULT 'active' CHECK (agent_status IN ('active', 'inactive', 'suspended', 'pending_approval')),
ADD COLUMN IF NOT EXISTS commission_override NUMERIC CHECK (commission_override >= 0 AND commission_override <= 100),
ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'standard' CHECK (access_level IN ('standard', 'premium', 'limited')),
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS license_number TEXT,
ADD COLUMN IF NOT EXISTS territory TEXT,
ADD COLUMN IF NOT EXISTS join_date DATE DEFAULT CURRENT_DATE;

-- Create agent activity tracking table
CREATE TABLE IF NOT EXISTS public.agent_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('login', 'proposal_created', 'proposal_signed', 'client_added', 'status_changed')),
  activity_data JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agent commissions tracking table
CREATE TABLE IF NOT EXISTS public.agent_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  base_rate NUMERIC NOT NULL DEFAULT 5.0,
  override_rate NUMERIC,
  final_rate NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  commission_status TEXT DEFAULT 'pending' CHECK (commission_status IN ('pending', 'approved', 'paid', 'disputed')),
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.profiles(id),
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Enable RLS on new tables
ALTER TABLE public.agent_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_commissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for agent_activities
CREATE POLICY "Admins can view all agent activities" 
ON public.agent_activities FOR SELECT 
USING (is_current_user_admin());

CREATE POLICY "Agents can view own activities" 
ON public.agent_activities FOR SELECT 
USING (agent_id = auth.uid());

CREATE POLICY "System can insert agent activities" 
ON public.agent_activities FOR INSERT 
WITH CHECK (true);

-- RLS policies for agent_commissions  
CREATE POLICY "Admins can manage all commissions" 
ON public.agent_commissions FOR ALL 
USING (is_current_user_admin());

CREATE POLICY "Agents can view own commissions" 
ON public.agent_commissions FOR SELECT 
USING (agent_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_agent_status 
ON public.profiles(agent_status, role) 
WHERE role IN ('agent', 'admin');

CREATE INDEX IF NOT EXISTS idx_profiles_last_active 
ON public.profiles(last_active_at DESC) 
WHERE role = 'agent';

CREATE INDEX IF NOT EXISTS idx_agent_activities_agent_created 
ON public.agent_activities(agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_commissions_agent_status 
ON public.agent_commissions(agent_id, commission_status);

-- Create function to update agent last active timestamp
CREATE OR REPLACE FUNCTION public.update_agent_last_active()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'agent' THEN
    NEW.last_active_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to track agent status changes
CREATE OR REPLACE FUNCTION public.track_agent_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if status actually changed
  IF OLD.agent_status IS DISTINCT FROM NEW.agent_status THEN
    NEW.status_changed_at = now();
    NEW.status_changed_by = auth.uid();
    
    -- Log the activity
    INSERT INTO public.agent_activities (
      agent_id,
      activity_type,
      activity_data
    ) VALUES (
      NEW.id,
      'status_changed',
      jsonb_build_object(
        'old_status', OLD.agent_status,
        'new_status', NEW.agent_status,
        'changed_by', auth.uid()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_agent_last_active_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role = 'agent')
  EXECUTE FUNCTION public.update_agent_last_active();

CREATE TRIGGER track_agent_status_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.role = 'agent' AND NEW.role = 'agent')
  EXECUTE FUNCTION public.track_agent_status_change();

-- Create optimized function to get agent dashboard data
CREATE OR REPLACE FUNCTION public.get_agents_management_data(
  status_filter TEXT DEFAULT NULL,
  search_term TEXT DEFAULT NULL,
  limit_param INTEGER DEFAULT 50,
  offset_param INTEGER DEFAULT 0
)
RETURNS TABLE(
  agent_id UUID,
  agent_name TEXT,
  agent_email TEXT,
  company_name TEXT,
  agent_status TEXT,
  access_level TEXT,
  commission_override NUMERIC,
  last_active_at TIMESTAMP WITH TIME ZONE,
  total_proposals BIGINT,
  active_proposals BIGINT,
  signed_proposals BIGINT,
  total_commission NUMERIC,
  join_date DATE,
  onboarding_completed BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH agent_stats AS (
    SELECT 
      p.agent_id,
      COUNT(*) as total_count,
      COUNT(*) FILTER (WHERE p.status IN ('pending', 'review_later')) as active_count,
      COUNT(*) FILTER (WHERE p.status = 'signed') as signed_count
    FROM public.proposals p
    WHERE p.deleted_at IS NULL 
      AND p.archived_at IS NULL
    GROUP BY p.agent_id
  ),
  commission_stats AS (
    SELECT 
      ac.agent_id,
      SUM(ac.commission_amount) as total_commission
    FROM public.agent_commissions ac
    WHERE ac.commission_status = 'paid'
    GROUP BY ac.agent_id
  )
  SELECT 
    pr.id,
    TRIM(CONCAT(COALESCE(pr.first_name, ''), ' ', COALESCE(pr.last_name, ''))) as name,
    pr.email,
    pr.company_name,
    pr.agent_status,
    pr.access_level,
    pr.commission_override,
    pr.last_active_at,
    COALESCE(ast.total_count, 0),
    COALESCE(ast.active_count, 0),
    COALESCE(ast.signed_count, 0),
    COALESCE(cs.total_commission, 0),
    pr.join_date,
    pr.onboarding_completed
  FROM public.profiles pr
  LEFT JOIN agent_stats ast ON pr.id = ast.agent_id
  LEFT JOIN commission_stats cs ON pr.id = cs.agent_id
  WHERE pr.role = 'agent'
    AND (status_filter IS NULL OR pr.agent_status = status_filter)
    AND (
      search_term IS NULL OR 
      pr.email ILIKE '%' || search_term || '%' OR
      pr.first_name ILIKE '%' || search_term || '%' OR
      pr.last_name ILIKE '%' || search_term || '%' OR
      pr.company_name ILIKE '%' || search_term || '%'
    )
  ORDER BY pr.last_active_at DESC NULLS LAST, pr.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$;