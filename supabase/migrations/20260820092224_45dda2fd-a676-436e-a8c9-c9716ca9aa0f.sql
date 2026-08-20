-- ============ ENUMS ============
CREATE TYPE public.broadcast_category AS ENUM ('operational', 'opportunity', 'newsletter');
CREATE TYPE public.broadcast_status AS ENUM ('draft', 'sending', 'sent', 'cancelled', 'failed');
CREATE TYPE public.broadcast_recipient_status AS ENUM ('pending', 'sent', 'failed', 'skipped_suppressed', 'skipped_opted_out');

-- ============ CAMPAIGNS ============
CREATE TABLE public.broadcast_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  preheader text,
  category public.broadcast_category NOT NULL,
  from_name text NOT NULL DEFAULT 'Crunch Carbon',
  from_email text NOT NULL DEFAULT 'partners@updates.crunchcarbon.com',
  reply_to text NOT NULL DEFAULT 'partners@crunchcarbon.com',
  audience jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.broadcast_status NOT NULL DEFAULT 'draft',
  total_recipients integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT broadcast_campaigns_sending_subdomain
    CHECK (lower(from_email) LIKE '%@updates.crunchcarbon.com')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcast_campaigns TO authenticated;
GRANT ALL ON public.broadcast_campaigns TO service_role;
ALTER TABLE public.broadcast_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage broadcast campaigns"
  ON public.broadcast_campaigns FOR ALL TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- ============ RECIPIENTS ============
CREATE TABLE public.broadcast_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.broadcast_campaigns(id) ON DELETE CASCADE,
  email text NOT NULL,
  recipient_name text,
  user_id uuid,
  client_id uuid,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.broadcast_recipient_status NOT NULL DEFAULT 'pending',
  message_id text,
  skip_reason text,
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX broadcast_recipients_campaign_email_uidx
  ON public.broadcast_recipients (campaign_id, lower(email));
CREATE INDEX broadcast_recipients_pending_idx
  ON public.broadcast_recipients (campaign_id) WHERE status = 'pending';
CREATE INDEX broadcast_recipients_message_id_idx
  ON public.broadcast_recipients (message_id) WHERE message_id IS NOT NULL;

GRANT SELECT ON public.broadcast_recipients TO authenticated;
GRANT ALL ON public.broadcast_recipients TO service_role;
ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view broadcast recipients"
  ON public.broadcast_recipients FOR SELECT TO authenticated
  USING (public.is_current_user_admin());

-- ============ PREFERENCES ============
CREATE TABLE public.broadcast_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  category public.broadcast_category NOT NULL,
  opted_out_at timestamptz NOT NULL DEFAULT now(),
  source text,
  campaign_id uuid REFERENCES public.broadcast_campaigns(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT broadcast_preferences_no_operational CHECK (category <> 'operational')
);

CREATE UNIQUE INDEX broadcast_preferences_email_category_uidx
  ON public.broadcast_preferences (lower(email), category);

GRANT SELECT ON public.broadcast_preferences TO authenticated;
GRANT ALL ON public.broadcast_preferences TO service_role;
ALTER TABLE public.broadcast_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view broadcast preferences"
  ON public.broadcast_preferences FOR SELECT TO authenticated
  USING (public.is_current_user_admin());

-- ============ EMAIL EVENTS: broadcast support ============
ALTER TABLE public.email_events
  ADD COLUMN broadcast_recipient_id uuid REFERENCES public.broadcast_recipients(id) ON DELETE CASCADE;

ALTER TABLE public.email_events
  ALTER COLUMN proposal_id DROP NOT NULL;

CREATE INDEX email_events_broadcast_recipient_idx
  ON public.email_events (broadcast_recipient_id) WHERE broadcast_recipient_id IS NOT NULL;

CREATE POLICY "Admins can view broadcast email events"
  ON public.email_events FOR SELECT TO authenticated
  USING (broadcast_recipient_id IS NOT NULL AND public.is_current_user_admin());

-- ============ COOLDOWN SCOPING ============
CREATE OR REPLACE FUNCTION public.can_send_client_email(p_email text, p_cooldown_days integer DEFAULT 7)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_recent_send timestamptz;
  v_recent_agent_contact timestamptz;
begin
  if p_email is null or length(trim(p_email)) = 0 then
    return false;
  end if;

  if public.is_client_email_suppressed(p_email) then
    return false;
  end if;

  -- Fatigue window is scoped to non-broadcast mail: sending a broadcast must never
  -- silently block proposal follow-ups. Hard suppressions above remain global.
  select max(occurred_at) into v_recent_send
  from public.email_events
  where lower(recipient_email) = lower(p_email)
    and broadcast_recipient_id is null
    and event_type in ('email.sent','email.delivered','sent','delivered');

  if v_recent_send is not null
     and v_recent_send > now() - make_interval(days => p_cooldown_days) then
    return false;
  end if;

  select max(l.created_at) into v_recent_agent_contact
  from public.proposal_automation_log l
  join public.proposals p on p.id = l.proposal_id
  where l.automation_type = 'manual_agent_contact'
    and lower(coalesce(p.content->'clientInfo'->>'email','')) = lower(p_email)
    and l.created_at > now() - make_interval(days => p_cooldown_days);

  if v_recent_agent_contact is not null then
    return false;
  end if;

  return true;
end;
$function$;

-- ============ PORTFOLIO REMINDER VIEW: ignore broadcast mail ============
CREATE OR REPLACE VIEW public.portfolio_reminder_candidates AS
 WITH unsigned AS (
         SELECT b.client_id,
            b.agent_id,
            b.company_id,
            lower(COALESCE(((p.content -> 'clientInfo'::text) ->> 'email'::text), ''::text)) AS client_email,
            COALESCE(((p.content -> 'clientInfo'::text) ->> 'fullName'::text), ''::text) AS client_name,
            b.proposal_id,
            b.bucket,
            b.estimated_client_revenue,
            b.invitation_sent_at,
            b.last_engagement_at
           FROM (proposal_engagement_buckets b
             JOIN proposals p ON ((p.id = b.proposal_id)))
          WHERE ((b.bucket = ANY (ARRAY['hot'::text, 'warm'::text, 'cold'::text])) AND (b.signed_at IS NULL) AND (b.archived_at IS NULL) AND (COALESCE(b.automation_paused, false) = false))
        ), agg AS (
         SELECT unsigned.client_email,
            (array_agg(unsigned.client_name ORDER BY unsigned.invitation_sent_at DESC NULLS LAST))[1] AS client_name,
            (array_agg(unsigned.client_id ORDER BY unsigned.invitation_sent_at DESC NULLS LAST))[1] AS client_id,
            (array_agg(unsigned.agent_id ORDER BY unsigned.invitation_sent_at DESC NULLS LAST))[1] AS agent_id,
            (array_agg(unsigned.company_id ORDER BY unsigned.invitation_sent_at DESC NULLS LAST))[1] AS company_id,
            count(*) AS unsigned_count,
            sum(unsigned.estimated_client_revenue) AS combined_revenue,
            count(*) FILTER (WHERE (unsigned.bucket = 'warm'::text)) AS warm_count,
            count(*) FILTER (WHERE (unsigned.bucket = 'hot'::text)) AS hot_count,
            array_agg(unsigned.proposal_id) AS proposal_ids,
            max(unsigned.last_engagement_at) AS last_engagement_at
           FROM unsigned
          WHERE (unsigned.client_email <> ''::text)
          GROUP BY unsigned.client_email
        ), last_portfolio_send AS (
         SELECT lower(email_events.recipient_email) AS email,
            max(email_events.occurred_at) AS last_sent_at
           FROM email_events
          WHERE (email_events.broadcast_recipient_id IS NULL) AND ((email_events.event_type = ANY (ARRAY['sent'::text, 'delivered'::text, 'email.sent'::text, 'email.delivered'::text])) AND ((COALESCE((email_events.raw_payload ->> 'template'::text), ''::text) = 'portfolio_reminder'::text) OR (COALESCE(((email_events.raw_payload -> 'tags'::text) ->> 'template'::text), ''::text) = 'portfolio_reminder'::text) OR (COALESCE(email_events.subject, ''::text) ~~* '%portfolio%'::text)))
          GROUP BY (lower(email_events.recipient_email))
        )
 SELECT a.client_email,
    a.client_name,
    a.client_id,
    a.agent_id,
    a.company_id,
    a.unsigned_count,
    a.combined_revenue,
    a.warm_count,
    a.hot_count,
    a.proposal_ids,
    a.last_engagement_at,
    lps.last_sent_at AS last_portfolio_reminder_at,
    (((a.unsigned_count >= 2) OR (a.combined_revenue >= (500000)::numeric)) AND (a.warm_count >= 1) AND can_send_client_email(a.client_email, 7) AND ((lps.last_sent_at IS NULL) OR (lps.last_sent_at < (now() - '14 days'::interval)))) AS eligible_for_email,
    (((a.unsigned_count >= 2) OR (a.combined_revenue >= (500000)::numeric)) AND (NOT ((a.warm_count >= 1) AND can_send_client_email(a.client_email, 7) AND ((lps.last_sent_at IS NULL) OR (lps.last_sent_at < (now() - '14 days'::interval)))))) AS route_to_agent
   FROM (agg a
     LEFT JOIN last_portfolio_send lps ON ((lps.email = a.client_email)));

-- ============ PROJECT STAGE HELPER ============
-- Mirrors the precedence used by the Project Onboarding list UI exactly.
CREATE OR REPLACE FUNCTION public.broadcast_project_stage(
  p_audit_ready boolean,
  p_submitted_for_review boolean,
  p_admin_validated boolean,
  p_onboarding_complete boolean,
  p_data_access_verified boolean
) RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  select case
    when coalesce(p_audit_ready, false) then 'audit_ready'
    when coalesce(p_submitted_for_review, false) and not coalesce(p_admin_validated, false) then 'awaiting_review'
    when coalesce(p_admin_validated, false) then 'under_review'
    when coalesce(p_onboarding_complete, false) or coalesce(p_data_access_verified, false) then 'in_progress'
    else 'not_started'
  end;
$function$;

-- ============ AUDIENCE RESOLVER ============
CREATE OR REPLACE FUNCTION public.resolve_broadcast_audience(p_audience jsonb)
RETURNS TABLE (
  email text,
  recipient_name text,
  user_id uuid,
  client_id uuid,
  context jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_type text := coalesce(p_audience->>'type', '');
begin
  if auth.uid() is not null and not public.is_current_user_admin() then
    raise exception 'Only admins can resolve broadcast audiences';
  end if;

  if v_type = 'onboarding_stage' then
    if (p_audience->'stages') is null
       or jsonb_typeof(p_audience->'stages') <> 'array'
       or jsonb_array_length(p_audience->'stages') = 0 then
      raise exception 'Project stage audience requires at least one stage';
    end if;

    -- One row per recipient, with EVERY matching project aggregated into context.
    -- There is deliberately no single project_title key: templates list projects.
    return query
    select
      e.email,
      (array_agg(e.recipient_name ORDER BY e.title))[1],
      (array_agg(e.user_id ORDER BY e.title))[1],
      (array_agg(e.client_id ORDER BY e.title))[1],
      jsonb_build_object(
        'projects', jsonb_agg(
          jsonb_build_object('title', e.title, 'stage', e.stage, 'proposal_id', e.proposal_id)
          ORDER BY e.title
        ),
        'project_count', count(*),
        'stages', to_jsonb(array_agg(DISTINCT e.stage))
      )
    from (
      select
        lower(trim(coalesce(c.email, p.content->'clientInfo'->>'email'))) as email,
        coalesce(nullif(trim(coalesce(c.first_name,'') || ' ' || coalesce(c.last_name,'')), ''),
                 p.content->'clientInfo'->>'fullName') as recipient_name,
        c.user_id as user_id,
        p.client_id as client_id,
        p.title as title,
        p.id as proposal_id,
        public.broadcast_project_stage(po.audit_ready, po.submitted_for_review, po.admin_validated,
                                       po.onboarding_complete, po.data_access_verified) as stage
      from public.project_onboarding po
      join public.proposals p on p.id = po.proposal_id
      left join public.clients c on c.id = p.client_id
      where p.archived_at is null
    ) e
    where e.email is not null and e.email <> ''
      and e.stage = any (select jsonb_array_elements_text(p_audience->'stages'))
    group by e.email;

  elsif v_type = 'super_partner_partners' then
    if (p_audience->>'super_partner_id') is null then
      raise exception 'Super partner audience requires a super_partner_id';
    end if;

    return query
    select distinct on (lower(pr.email))
      lower(trim(pr.email)),
      nullif(trim(coalesce(pr.first_name,'') || ' ' || coalesce(pr.last_name,'')), ''),
      pr.id,
      null::uuid,
      jsonb_build_object('company', co.company_name)
    from public.profiles pr
    join public.company_members cm on cm.user_id = pr.id and cm.status = 'active'
    join public.companies co on co.id = cm.company_id
    where co.super_partner_id = (p_audience->>'super_partner_id')::uuid
      and pr.email is not null and trim(pr.email) <> ''
    order by lower(pr.email);

  elsif v_type = 'partner_clients' then
    if (p_audience->>'agent_id') is null then
      raise exception 'Partner clients audience requires an agent_id';
    end if;

    return query
    select distinct on (lower(e.email))
      e.email, e.recipient_name, e.user_id, e.client_id,
      jsonb_build_object('agent_id', (p_audience->>'agent_id'))
    from (
      select
        lower(trim(coalesce(c.email, p.content->'clientInfo'->>'email'))) as email,
        coalesce(nullif(trim(coalesce(c.first_name,'') || ' ' || coalesce(c.last_name,'')), ''),
                 p.content->'clientInfo'->>'fullName') as recipient_name,
        c.user_id as user_id,
        p.client_id as client_id
      from public.proposals p
      left join public.clients c on c.id = p.client_id
      where p.agent_id = (p_audience->>'agent_id')::uuid
        and p.archived_at is null
    ) e
    where e.email is not null and e.email <> ''
    order by lower(e.email);

  elsif v_type = 'role' then
    -- An absent or empty roles array must never resolve to "everyone".
    if (p_audience->'roles') is null
       or jsonb_typeof(p_audience->'roles') <> 'array'
       or jsonb_array_length(p_audience->'roles') = 0 then
      raise exception 'Role audience requires at least one role';
    end if;

    return query
    select distinct on (lower(pr.email))
      lower(trim(pr.email)),
      nullif(trim(coalesce(pr.first_name,'') || ' ' || coalesce(pr.last_name,'')), ''),
      pr.id,
      null::uuid,
      jsonb_build_object('role', pr.role)
    from public.profiles pr
    where pr.email is not null and trim(pr.email) <> ''
      and pr.role = any (select jsonb_array_elements_text(p_audience->'roles'))
    order by lower(pr.email);

  elsif v_type = 'company' then
    if (p_audience->'client_company_ids') is null
       or jsonb_typeof(p_audience->'client_company_ids') <> 'array'
       or jsonb_array_length(p_audience->'client_company_ids') = 0 then
      raise exception 'Company audience requires at least one company';
    end if;

    return query
    select distinct on (lower(e.email))
      e.email, e.recipient_name, e.user_id, e.client_id, jsonb_build_object('company_id', e.cid)
    from (
      select lower(trim(c.email)) as email,
             nullif(trim(coalesce(c.first_name,'') || ' ' || coalesce(c.last_name,'')), '') as recipient_name,
             c.user_id as user_id,
             c.id as client_id,
             c.client_company_id as cid
      from public.clients c
      where c.client_company_id = any (
        select (jsonb_array_elements_text(p_audience->'client_company_ids'))::uuid
      )
    ) e
    where e.email is not null and e.email <> ''
    order by lower(e.email);

  elsif v_type = 'manual' then
    if (p_audience->'emails') is null
       or jsonb_typeof(p_audience->'emails') <> 'array'
       or jsonb_array_length(p_audience->'emails') = 0 then
      raise exception 'Manual audience requires at least one email address';
    end if;

    return query
    select distinct on (lower(m.addr))
      lower(trim(m.addr)), null::text, null::uuid, null::uuid, '{}'::jsonb
    from (select jsonb_array_elements_text(p_audience->'emails') as addr) m
    where trim(m.addr) <> '' and m.addr like '%@%'
    order by lower(m.addr);

  else
    raise exception 'Unknown audience type: %', v_type;
  end if;
end;
$function$;

GRANT EXECUTE ON FUNCTION public.resolve_broadcast_audience(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.broadcast_project_stage(boolean, boolean, boolean, boolean, boolean) TO authenticated, service_role;

CREATE TRIGGER update_broadcast_campaigns_updated_at
  BEFORE UPDATE ON public.broadcast_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();