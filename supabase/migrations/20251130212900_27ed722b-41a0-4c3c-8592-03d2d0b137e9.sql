-- Create client_referrals table to track referral relationships
CREATE TABLE IF NOT EXISTS public.client_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  referred_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  CONSTRAINT client_referrals_unique_referral UNIQUE(referrer_id, referred_email),
  CONSTRAINT client_referrals_status_check CHECK (status IN ('pending', 'confirmed', 'expired'))
);

-- Enable RLS
ALTER TABLE public.client_referrals ENABLE ROW LEVEL SECURITY;

-- Policy: Clients can view their own referrals
CREATE POLICY "Clients can view own referrals"
  ON public.client_referrals
  FOR SELECT
  USING (referrer_id = auth.uid());

-- Policy: Admins can view all referrals
CREATE POLICY "Admins can view all referrals"
  ON public.client_referrals
  FOR SELECT
  USING (is_current_user_admin());

-- Policy: System can insert referrals
CREATE POLICY "System can insert referrals"
  ON public.client_referrals
  FOR INSERT
  WITH CHECK (true);

-- Policy: System can update referral status
CREATE POLICY "System can update referrals"
  ON public.client_referrals
  FOR UPDATE
  USING (true);

-- Create index for faster referrer queries
CREATE INDEX IF NOT EXISTS idx_client_referrals_referrer_id ON public.client_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_client_referrals_status ON public.client_referrals(status);