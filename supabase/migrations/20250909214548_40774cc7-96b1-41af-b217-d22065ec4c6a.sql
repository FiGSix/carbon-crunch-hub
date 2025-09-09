-- Upload new logo to storage bucket
-- We'll insert the file into storage.objects directly
-- Note: This creates a reference but the actual file content needs to be uploaded via the dashboard

-- Create the bucket entry if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-logos', 'company-logos', true) 
ON CONFLICT (id) DO NOTHING;