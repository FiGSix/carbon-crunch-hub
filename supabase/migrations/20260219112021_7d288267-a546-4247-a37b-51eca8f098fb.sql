-- Migration: add client company member check to is_project_stakeholder
-- ONLY change: appends OR EXISTS (client_company_members) as check 6
-- All existing 5 checks reproduced verbatim from the live function
-- No RLS policies, tables, triggers, or other functions are touched

CREATE OR REPLACE FUNCTION public.is_project_stakeholder(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_onboarding po
    JOIN public.proposals p ON p.id = po.proposal_id
    WHERE po.id = _project_id
      AND (
        public.is_current_user_admin()                          -- check 1 (unchanged)
        OR p.agent_id = auth.uid()                              -- check 2 (unchanged)
        OR p.client_id = auth.uid()                             -- check 3 (unchanged)
        OR EXISTS (                                             -- check 4 (unchanged)
          SELECT 1 FROM public.clients c
          WHERE c.id = p.client_reference_id
            AND c.user_id = auth.uid()
        )
        OR EXISTS (                                             -- check 5 (unchanged)
          SELECT 1
          FROM public.company_members cm1
          JOIN public.company_members cm2 ON cm1.company_id = cm2.company_id
          WHERE cm1.user_id = auth.uid()
            AND cm2.user_id = p.agent_id
            AND cm1.status = 'active'
            AND cm2.status = 'active'
        )
        OR EXISTS (                                             -- check 6 (NEW - client company member)
          SELECT 1
          FROM public.clients c
          JOIN public.client_company_members ccm
            ON ccm.client_company_id = c.client_company_id
          WHERE c.id = p.client_reference_id
            AND ccm.user_id = auth.uid()
            AND ccm.status = 'active'
        )
      )
  );
$function$;