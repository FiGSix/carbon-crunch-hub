## Admin referral link — reuse agent logic

### The change

In `src/pages/Profile.tsx`, extend the existing condition so admins render the same widget agents do:

```tsx
{(isAgent || isAdmin) && <ReferralLinkWidget linkType="client" />}
```

### Why this is sufficient (attribution check)

Confirmed in `supabase/functions/create-referral-proposal/index.ts`:

- Proposals from `/ref/:token` are created with `agent_id = link.owner_id` and `company_id` resolved via `ensure_agent_has_company(link.owner_id)`.
- Both existing admins (Shaun, Marco) are already members of the **Crunch Carbon** company, so every admin-sourced referral automatically attributes to Crunch Carbon at the company level.
- The individual admin still appears as `agent_id`, which is useful for "who shared it" tracking — not a problem.

No house account, no shared link, no migration, no new component.

### Out of scope

- Agent and super-partner behaviour — unchanged.
- Admin recruitment (agent-type) link — not added; client link only per earlier decision.
- Proposal pipeline, RLS, `/ref/:token` handler — unchanged.
