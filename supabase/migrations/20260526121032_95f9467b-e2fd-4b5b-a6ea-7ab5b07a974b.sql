
-- Phase 1: outreach template variants
CREATE TABLE public.outreach_template_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES public.outreach_sequences(id) ON DELETE CASCADE,
  step_index integer NOT NULL,
  subject text NOT NULL,
  body_template text NOT NULL,
  cta_label text,
  cta_url text,
  weight numeric NOT NULL DEFAULT 1.0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','retired')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_otv_seq_step ON public.outreach_template_variants(sequence_id, step_index) WHERE status = 'active';

ALTER TABLE public.outreach_template_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage outreach_template_variants"
  ON public.outreach_template_variants FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_otv_updated_at
  BEFORE UPDATE ON public.outreach_template_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Track which variant was used
ALTER TABLE public.lead_outreach_history ADD COLUMN variant_id uuid REFERENCES public.outreach_template_variants(id) ON DELETE SET NULL;
CREATE INDEX idx_loh_variant ON public.lead_outreach_history(variant_id);

ALTER TABLE public.outreach_replies ADD COLUMN variant_id uuid REFERENCES public.outreach_template_variants(id) ON DELETE SET NULL;

-- Backfill: one variant per existing step
INSERT INTO public.outreach_template_variants (sequence_id, step_index, subject, body_template, cta_label, cta_url, weight, status, notes)
SELECT s.id,
       (step_ord.ord - 1)::int AS step_index,
       COALESCE(step_data->>'subject', '(no subject)') AS subject,
       COALESCE(step_data->>'body_template', '') AS body_template,
       step_data->>'cta_label',
       step_data->>'cta_url',
       1.0,
       'active',
       'Backfilled from outreach_sequences.steps'
FROM public.outreach_sequences s
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.steps, '[]'::jsonb)) WITH ORDINALITY AS step_ord(step_data, ord)
WHERE s.steps IS NOT NULL;
