-- Create storage bucket for onboarding documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('onboarding-documents', 'onboarding-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for onboarding documents bucket
CREATE POLICY "Authenticated users can upload onboarding documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'onboarding-documents');

CREATE POLICY "Users can view own project documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'onboarding-documents' AND
  EXISTS (
    SELECT 1 FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE (storage.foldername(name))[1] = po.id::text
    AND (
      p.client_id = auth.uid() OR
      p.agent_id = auth.uid() OR
      p.client_reference_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR
      public.is_current_user_admin()
    )
  )
);

CREATE POLICY "Users can delete own project documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'onboarding-documents' AND
  EXISTS (
    SELECT 1 FROM project_onboarding po
    JOIN proposals p ON p.id = po.proposal_id
    WHERE (storage.foldername(name))[1] = po.id::text
    AND (
      p.client_id = auth.uid() OR
      p.agent_id = auth.uid() OR
      p.client_reference_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR
      public.is_current_user_admin()
    )
  )
);