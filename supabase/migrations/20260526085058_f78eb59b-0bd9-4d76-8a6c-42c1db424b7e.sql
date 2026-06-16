
-- 1. proposals: source + lead_id
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.agent_leads(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_lead_id ON public.proposals(lead_id);

-- 2. discovery presets
CREATE TABLE IF NOT EXISTS public.sales_agent_discovery_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  location text NOT NULL,
  limit_count int NOT NULL DEFAULT 10,
  active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_agent_discovery_presets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage discovery presets" ON public.sales_agent_discovery_presets;
CREATE POLICY "Admins manage discovery presets"
  ON public.sales_agent_discovery_presets
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed defaults (idempotent on query+location)
INSERT INTO public.sales_agent_discovery_presets (query, location, limit_count)
SELECT v.query, v.location, 10
FROM (VALUES
  ('EPC solar installer', 'Gauteng, South Africa'),
  ('EPC solar installer', 'Western Cape, South Africa'),
  ('EPC solar installer', 'KwaZulu-Natal, South Africa'),
  ('Commercial solar PV installer', 'South Africa')
) AS v(query, location)
WHERE NOT EXISTS (
  SELECT 1 FROM public.sales_agent_discovery_presets p
  WHERE p.query = v.query AND p.location = v.location
);

-- 3. settings: reply autopilot confidence threshold
ALTER TABLE public.sales_agent_settings
  ADD COLUMN IF NOT EXISTS autopilot_reply_min_confidence smallint NOT NULL DEFAULT 90;

-- 4. Trigger: when an agent_lead transitions to meeting_booked, fire draft-proposal
CREATE OR REPLACE FUNCTION public.trg_agent_leads_draft_proposal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fn_url text := 'https://uyjryuopuqgmsvayiccl.supabase.co/functions/v1/sales-agent-draft-proposal';
  anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5anJ5dW9wdXFnbXN2YXlpY2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNzU2MzgsImV4cCI6MjA1OTg1MTYzOH0.M828t6sJxh4lZAVACqpRosoRvW_VibHDAMSXV-3WrLo';
BEGIN
  IF NEW.status = 'meeting_booked' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM net.http_post(
      url := fn_url,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||anon,'apikey',anon),
      body := jsonb_build_object('lead_id', NEW.id, 'trigger','status_change')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS agent_leads_status_to_proposal_trg ON public.agent_leads;
CREATE TRIGGER agent_leads_status_to_proposal_trg
  AFTER UPDATE OF status ON public.agent_leads
  FOR EACH ROW EXECUTE FUNCTION public.trg_agent_leads_draft_proposal();
