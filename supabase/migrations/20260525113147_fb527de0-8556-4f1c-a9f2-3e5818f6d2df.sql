
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
  )
  or exists (
    select 1 from public.email_events
    where lower(recipient_email) = lower(p_email)
      and event_type in ('email.bounced','bounced','email.complained','complained')
  );
$$;

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

  select max(occurred_at) into v_recent_send
  from public.email_events
  where lower(recipient_email) = lower(p_email)
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
$$;
