-- 1. Admin-maintained exclusion list, consulted ONLY by the broadcast resolver.
create table if not exists public.broadcast_excluded_addresses (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  reason text,
  added_by uuid references public.profiles(id) on delete set null,
  added_at timestamptz not null default now()
);

create unique index if not exists broadcast_excluded_addresses_email_key
  on public.broadcast_excluded_addresses (lower(trim(email)));

grant select, insert, update, delete on public.broadcast_excluded_addresses to authenticated;
grant all on public.broadcast_excluded_addresses to service_role;

alter table public.broadcast_excluded_addresses enable row level security;

drop policy if exists "Admins manage broadcast exclusions" on public.broadcast_excluded_addresses;
create policy "Admins manage broadcast exclusions"
  on public.broadcast_excluded_addresses
  for all
  to authenticated
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

-- 2. Raw resolver: per-branch rows, now carrying provenance + self-authored info.
create or replace function public.resolve_broadcast_audience_raw(p_audience jsonb)
returns table(
  email text,
  recipient_name text,
  user_id uuid,
  client_id uuid,
  context jsonb,
  self_authored boolean,
  source text
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_type text := coalesce(p_audience->>'type', '');
begin
  if v_type = 'onboarding_stage' then
    if (p_audience->'stages') is null
       or jsonb_typeof(p_audience->'stages') <> 'array'
       or jsonb_array_length(p_audience->'stages') = 0 then
      raise exception 'Project stage audience requires at least one stage';
    end if;

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
      ),
      bool_or(e.is_self_authored),
      case when bool_or(e.from_client_record) then 'client_record' else 'json_snapshot' end
    from (
      select
        lower(trim(coalesce(c.email, p.content->'clientInfo'->>'email'))) as email,
        coalesce(nullif(trim(coalesce(c.first_name,'') || ' ' || coalesce(c.last_name,'')), ''),
                 p.content->'clientInfo'->>'fullName') as recipient_name,
        c.user_id as user_id,
        p.client_id as client_id,
        p.title as title,
        p.id as proposal_id,
        (c.email is not null and trim(c.email) <> '') as from_client_record,
        (lower(trim(coalesce(c.email, p.content->'clientInfo'->>'email'))) = lower(trim(ap.email))) as is_self_authored,
        public.broadcast_project_stage(po.audit_ready, po.submitted_for_review, po.admin_validated,
                                       po.onboarding_complete, po.data_access_verified) as stage
      from public.project_onboarding po
      join public.proposals p on p.id = po.proposal_id
      left join public.clients c on c.id = p.client_id
      left join public.profiles ap on ap.id = p.agent_id
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
      jsonb_build_object('company', co.company_name),
      false,
      'profile'::text
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
      jsonb_build_object('agent_id', (p_audience->>'agent_id')),
      e.is_self_authored,
      case when e.from_client_record then 'client_record' else 'json_snapshot' end
    from (
      select
        lower(trim(coalesce(c.email, p.content->'clientInfo'->>'email'))) as email,
        coalesce(nullif(trim(coalesce(c.first_name,'') || ' ' || coalesce(c.last_name,'')), ''),
                 p.content->'clientInfo'->>'fullName') as recipient_name,
        c.user_id as user_id,
        p.client_id as client_id,
        (c.email is not null and trim(c.email) <> '') as from_client_record,
        (lower(trim(coalesce(c.email, p.content->'clientInfo'->>'email'))) = lower(trim(ap.email))) as is_self_authored
      from public.proposals p
      left join public.clients c on c.id = p.client_id
      left join public.profiles ap on ap.id = p.agent_id
      where p.agent_id = (p_audience->>'agent_id')::uuid
        and p.archived_at is null
    ) e
    where e.email is not null and e.email <> ''
    order by lower(e.email), e.from_client_record desc;

  elsif v_type = 'role' then
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
      jsonb_build_object('role', pr.role),
      false,
      'profile'::text
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
      e.email, e.recipient_name, e.user_id, e.client_id,
      jsonb_build_object('company_id', e.cid),
      false,
      'client_record'::text
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
      lower(trim(m.addr)), null::text, null::uuid, null::uuid, '{}'::jsonb, false, 'manual'::text
    from (select jsonb_array_elements_text(p_audience->'emails') as addr) m
    where trim(m.addr) <> '' and m.addr like '%@%'
    order by lower(m.addr);

  else
    raise exception 'Unknown audience type: %', v_type;
  end if;
end;
$function$;

revoke all on function public.resolve_broadcast_audience_raw(jsonb) from public, anon, authenticated;
grant execute on function public.resolve_broadcast_audience_raw(jsonb) to service_role;

-- 3. Public resolver: hard-drops only explicit exclusions; everything else is flagged.
--    Staff are only excluded by default on client-derived audiences, where a staff
--    recipient is genuinely unexpected. On role / super_partner / manual audiences
--    staff are the intended recipients: flagged for information, never pre-excluded.
drop function if exists public.resolve_broadcast_audience(jsonb);

create function public.resolve_broadcast_audience(p_audience jsonb)
returns table(
  email text,
  recipient_name text,
  user_id uuid,
  client_id uuid,
  context jsonb,
  flags jsonb,
  excluded_by_default boolean
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_type text := coalesce(p_audience->>'type', '');
  v_staff_excluded boolean := v_type in ('onboarding_stage', 'partner_clients', 'company');
begin
  if auth.uid() is not null and not public.is_current_user_admin() then
    raise exception 'Only admins can resolve broadcast audiences';
  end if;

  return query
  select
    r.email,
    r.recipient_name,
    r.user_id,
    r.client_id,
    r.context,
    jsonb_build_object(
      'source', r.source,
      'self_authored', coalesce(r.self_authored, false),
      'is_staff', coalesce(s.is_staff, false),
      'staff_roles', coalesce(s.roles, '[]'::jsonb),
      'staff_expected', not v_staff_excluded
    ),
    (
      coalesce(r.self_authored, false)
      or (v_staff_excluded and coalesce(s.is_staff, false))
    )
  from public.resolve_broadcast_audience_raw(p_audience) r
  left join lateral (
    select
      true as is_staff,
      to_jsonb(array_agg(distinct pr.role)) as roles
    from public.profiles pr
    where lower(trim(pr.email)) = r.email
      and pr.role in ('admin', 'agent', 'super_partner')
    having count(*) > 0
  ) s on true
  where not exists (
    select 1 from public.broadcast_excluded_addresses x
    where lower(trim(x.email)) = r.email
  );
end;
$function$;

revoke all on function public.resolve_broadcast_audience(jsonb) from public, anon;
grant execute on function public.resolve_broadcast_audience(jsonb) to authenticated, service_role;