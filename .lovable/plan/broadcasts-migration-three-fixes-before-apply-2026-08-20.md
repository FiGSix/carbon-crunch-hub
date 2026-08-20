# Broadcasts migration — three fixes before apply

All three are folded into the same (not-yet-applied) migration, so nothing needs a follow-up patch.

## 1. Sending identity locked to the subdomain

- `from_email` default becomes `partners@updates.crunchcarbon.com`.
- `reply_to` default becomes `partners@crunchcarbon.com` (monitored apex address, NOT NULL).
- A check constraint refuses any `from_email` outside the sending subdomain, so a campaign can never be created or updated to send from the apex domain — not just blocked at send time:

```sql
CONSTRAINT broadcast_campaigns_sending_subdomain
  CHECK (lower(from_email) LIKE '%@updates.crunchcarbon.com')
```

The apex stays legal for `reply_to`, which carries no sending reputation.

## 2. Empty role list is now an error, not "everybody"

In `resolve_broadcast_audience`, the `role` branch raises before it queries:

```sql
if (p_audience->'roles') is null
   or jsonb_typeof(p_audience->'roles') <> 'array'
   or jsonb_array_length(p_audience->'roles') = 0 then
  raise exception 'Role audience requires at least one role';
end if;
```

A UI slip now fails loudly at preview time instead of resolving to all profiles. Same guard shape is applied to the `manual` and `company` branches (empty list raises rather than silently resolving to zero or everything).

## 3. Onboarding-stage audience: aggregated, not arbitrary

I chose **aggregate**, not "one-per-client, don't name a project".

The branch groups by lower(email) and returns every qualifying project for that client in the context, so a merge tag can list them:

```json
{
  "projects": [
    { "title": "Weylandts Tyger Valley", "stage": "audit_ready", "proposal_id": "..." },
    { "title": "Jacobs Hoogte", "stage": "in_progress", "proposal_id": "..." }
  ],
  "project_count": 2,
  "stages": ["audit_ready", "in_progress"]
}
```

There is no single `project_title` key any more, so a template cannot accidentally merge one arbitrary project — the field simply does not exist. Templates render `{{projects}}` as a list. `distinct on (...) order by ... e.title` is removed entirely in favour of `group by`.

## Unchanged from what you already reviewed

Tables (`broadcast_campaigns`, `broadcast_recipients`, `broadcast_preferences`), the operational-category opt-out ban, `email_events.broadcast_recipient_id`, the broadcast-scoped fatigue fix in `can_send_client_email` and `portfolio_reminder_candidates`, `broadcast_project_stage`, RLS (admin-only) and grants all stay as previously planned.

## Note on the sending domain

`updates.crunchcarbon.com` must exist and be verified in Resend before the first send; the constraint will otherwise happily accept addresses on a domain that bounces everything. Domain verification is a Resend dashboard step, not part of this migration.
