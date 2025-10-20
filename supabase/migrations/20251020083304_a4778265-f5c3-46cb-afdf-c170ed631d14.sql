-- Add client share override tracking columns to proposals table
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS client_share_override_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS client_share_override_set_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS client_share_override_set_at TIMESTAMP WITH TIME ZONE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_proposals_client_share_override 
ON proposals(client_share_override_enabled) 
WHERE client_share_override_enabled = true;

-- Add comment for documentation
COMMENT ON COLUMN proposals.client_share_override_enabled IS 'Indicates if client_share_percentage is a manual override vs auto-calculated from portfolio size';
COMMENT ON COLUMN proposals.client_share_override_set_by IS 'Admin who set the client share override';
COMMENT ON COLUMN proposals.client_share_override_set_at IS 'Timestamp when the override was set';