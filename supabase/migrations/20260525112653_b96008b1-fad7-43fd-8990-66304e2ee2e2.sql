
-- Suppression reason enum
do $$ begin
  create type public.client_suppression_reason as enum (
    'manual', 'bounce', 'complaint', 'unsubscribe', 'fatigue', 'invalid'
  );
exception when duplicate_object then null; end $$;

-- Suppression table (append-only)
create table if not exists public.client_email_suppressions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  reason public.client_suppression_reason not null,
  notes text,
  source text,
  created_at timestamptz not null default now(),
  created_by uuid
);

create unique index if not exists client_email_suppressions_email_reason_uniq
  on public.client_email_suppressions (lower(email), reason);
create index if not exists client_email_suppressions_email_idx
  on public.client_email_suppressions (lower(email));

alter table public.client_email_suppressions enable row level security;

-- Admins can read
do $$ begin
  create policy "Admins can view suppressions"
    on public.client_email_suppressions for select
    using (public.has_role(auth.uid(), 'admin'));
exception when duplicate_object then null; end $$;

-- Admins can insert manual entries
do $$ begin
  create policy "Admins can insert suppressions"
    on public.client_email_suppressions for insert
    with check (public.has_role(auth.uid(), 'admin'));
exception when duplicate_object then null; end $$;

-- No update/delete policies => append-only for non-service-role

-- Helper: is this email currently suppressed?
create or replace function public.is_client_email_suppressed(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.client_email_suppressions
    where lower(email) = lower(p_email)
  );
$$;

-- Helper: can we send a platform email to this client right now?
-- Honours: suppression list, 7-day platform email cooldown, 7-day agent-contact pause.
create or replace function public.can_send_client_email(
  p_email text,
  p_cooldown_days int default 7
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
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

  -- Most recent platform send to this email across any proposal
  select max(occurred_at) into v_recent_send
  from public.email_events
  where lower(recipient_email) = lower(p_email)
    and event_type in ('sent','delivered');

  if v_recent_send is not null
     and v_recent_send > now() - make_interval(days => p_cooldown_days) then
    return false;
  end if;

  -- Agent-logged contact in last cooldown window (manual logged activity)
  select max(created_at) into v_recent_agent_contact
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
$$;

grant execute on function public.is_client_email_suppressed(text) to authenticated, service_role;
grant execute on function public.can_send_client_email(text, int) to authenticated, service_role;
