-- Add portfolio client share override fields to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS portfolio_client_share_override numeric;

ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS portfolio_override_set_at timestamp with time zone;

ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS portfolio_override_set_by uuid REFERENCES public.profiles(id);

-- Add comments for documentation
COMMENT ON COLUMN public.clients.portfolio_client_share_override IS 
'Portfolio-level client share percentage override that applies to all proposals for this client';

COMMENT ON COLUMN public.clients.portfolio_override_set_at IS 
'Timestamp when the portfolio override was last set';

COMMENT ON COLUMN public.clients.portfolio_override_set_by IS 
'User ID who set the portfolio override';