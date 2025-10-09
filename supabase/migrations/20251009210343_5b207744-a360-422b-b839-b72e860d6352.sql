-- Add witness columns to proposal_agreements table for automatic system witnessing
ALTER TABLE public.proposal_agreements
ADD COLUMN IF NOT EXISTS witness_1_name TEXT DEFAULT 'ANDREW D. STOCKIL',
ADD COLUMN IF NOT EXISTS witness_1_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS witness_1_ip_address INET,
ADD COLUMN IF NOT EXISTS witness_2_name TEXT DEFAULT 'JOHANITA BURGER',
ADD COLUMN IF NOT EXISTS witness_2_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS witness_2_ip_address INET,
ADD COLUMN IF NOT EXISTS witness_method TEXT DEFAULT 'automatic_system';

-- Add comment to explain the witness columns
COMMENT ON COLUMN public.proposal_agreements.witness_method IS 'Method used for witnessing: automatic_system, manual_email, etc.';
COMMENT ON COLUMN public.proposal_agreements.witness_1_name IS 'Name of first witness (default: ANDREW D. STOCKIL)';
COMMENT ON COLUMN public.proposal_agreements.witness_2_name IS 'Name of second witness (default: JOHANITA BURGER)';