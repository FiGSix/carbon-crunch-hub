-- Create vintage_audit_status table
CREATE TABLE IF NOT EXISTS public.vintage_audit_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vintage_year TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(vintage_year, stage_id)
);

-- Create vintage_progress_notes table
CREATE TABLE IF NOT EXISTS public.vintage_progress_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vintage_year TEXT NOT NULL UNIQUE,
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.vintage_audit_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vintage_progress_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vintage_audit_status
CREATE POLICY "Admins can manage vintage audit status"
  ON public.vintage_audit_status
  FOR ALL
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Users can view vintage audit status"
  ON public.vintage_audit_status
  FOR SELECT
  USING (true);

-- RLS Policies for vintage_progress_notes
CREATE POLICY "Admins can manage vintage progress notes"
  ON public.vintage_progress_notes
  FOR ALL
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Users can view vintage progress notes"
  ON public.vintage_progress_notes
  FOR SELECT
  USING (true);

-- Create updated_at trigger for vintage_audit_status
CREATE TRIGGER update_vintage_audit_status_updated_at
  BEFORE UPDATE ON public.vintage_audit_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for vintage_progress_notes
CREATE TRIGGER update_vintage_progress_notes_updated_at
  BEFORE UPDATE ON public.vintage_progress_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();