-- Create calculator_results table for lead generation
CREATE TABLE calculator_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  system_size_kwp NUMERIC NOT NULL,
  commissioning_date DATE NOT NULL,
  invitation_token TEXT NOT NULL UNIQUE,
  invitation_expires_at TIMESTAMPTZ NOT NULL,
  invitation_sent_at TIMESTAMPTZ DEFAULT now(),
  invitation_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Indexes for performance
CREATE INDEX idx_calculator_results_token ON calculator_results(invitation_token);
CREATE INDEX idx_calculator_results_email ON calculator_results(email);
CREATE INDEX idx_calculator_results_created_at ON calculator_results(created_at DESC);
CREATE INDEX idx_calculator_results_expires_at ON calculator_results(invitation_expires_at);

-- Enable RLS
ALTER TABLE calculator_results ENABLE ROW LEVEL SECURITY;

-- Public read access with valid token
CREATE POLICY "calculator_results_token_access" ON calculator_results
  FOR SELECT
  USING (
    invitation_token IS NOT NULL 
    AND invitation_expires_at > now()
  );

-- System can insert calculator results
CREATE POLICY "calculator_results_system_insert" ON calculator_results
  FOR INSERT
  WITH CHECK (true);

-- Admins can view all calculator results for analytics
CREATE POLICY "calculator_results_admin_view" ON calculator_results
  FOR SELECT
  USING (is_current_user_admin());