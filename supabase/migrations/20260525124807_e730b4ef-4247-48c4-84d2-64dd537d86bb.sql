-- Allow admins to remove blocks
CREATE POLICY "Admins can delete suppressions"
ON public.client_email_suppressions
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Prevent duplicate emails (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS client_email_suppressions_email_lower_idx
ON public.client_email_suppressions (lower(email));