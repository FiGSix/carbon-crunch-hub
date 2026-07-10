
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS audit_ready boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_proposals_audit_ready ON public.proposals (audit_ready) WHERE audit_ready = true;

UPDATE public.proposals p
SET audit_ready = COALESCE(po.audit_ready, false)
FROM public.project_onboarding po
WHERE po.proposal_id = p.id
  AND p.audit_ready IS DISTINCT FROM COALESCE(po.audit_ready, false);

CREATE OR REPLACE FUNCTION public.sync_proposal_audit_ready()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.proposals
       SET audit_ready = false
     WHERE id = OLD.proposal_id
       AND audit_ready IS DISTINCT FROM false;
    RETURN OLD;
  END IF;

  UPDATE public.proposals
     SET audit_ready = COALESCE(NEW.audit_ready, false)
   WHERE id = NEW.proposal_id
     AND audit_ready IS DISTINCT FROM COALESCE(NEW.audit_ready, false);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_proposal_audit_ready_ins ON public.project_onboarding;
DROP TRIGGER IF EXISTS trg_sync_proposal_audit_ready_upd ON public.project_onboarding;
DROP TRIGGER IF EXISTS trg_sync_proposal_audit_ready_del ON public.project_onboarding;

CREATE TRIGGER trg_sync_proposal_audit_ready_ins
AFTER INSERT ON public.project_onboarding
FOR EACH ROW EXECUTE FUNCTION public.sync_proposal_audit_ready();

CREATE TRIGGER trg_sync_proposal_audit_ready_upd
AFTER UPDATE OF audit_ready ON public.project_onboarding
FOR EACH ROW EXECUTE FUNCTION public.sync_proposal_audit_ready();

CREATE TRIGGER trg_sync_proposal_audit_ready_del
AFTER DELETE ON public.project_onboarding
FOR EACH ROW EXECUTE FUNCTION public.sync_proposal_audit_ready();
