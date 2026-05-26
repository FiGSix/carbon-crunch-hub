# Why Juan doesn't see the Rhino Energy projects

## Diagnosis (from the live DB)

**Juan Mallinson** — `mallinson@rhinoenergy.co.za`
- Registered user `28dca0b6…`, role `client`, profile `company_name = "Rhino Energy (Pty) Ltd"`
- No row in `company_members`
- No row in `user_roles`
- Also exists as a *contact* in `clients` (`b8122310…`) — that's a separate record from his auth user

**Naazia Hassan** — `naazia@rhinoenergy.co.za`
- Exists **only** as a contact in `clients` (`86c3410f…`)
- Not a registered user. She's a second Rhino contact, not the same person as Juan.

**The Rhino proposal** (`ba535795…`, status `delivered`, agent Shaun)
- `client_reference_id` → Naazia's contact row
- `client_id` → **NULL** (never linked to any auth user)
- `content.clientInfo.companyName` = "Rhino Energy (Pty) Ltd"

**Why nothing shows on Juan's dashboard:**
The client view in `ProposalService.getProposalsWithRelations` filters with
`query.eq('client_id', userId)`. Juan's `client_id` is `NULL` on the only Rhino
proposal, so it's filtered out. Same story for any other Rhino proposal made to
a contact — they're linked to a `clients` row, not to Juan's auth user.

There is also no `companies` row called "Rhino Energy" and no `company_members`
link, so company-based fallbacks find nothing either.

## What to change

Goal: a registered client should see proposals belonging to their company,
whether the proposal was created against their own auth user or against a
contact (themselves or a colleague) sharing the same company / email domain.

### A. Immediate backfill (one-off)
1. For each registered `client` profile with a `company_name`, find `clients`
   contacts whose `company_name` matches OR whose email domain matches the
   profile's email domain, and set `proposals.client_id = profile.id` where it
   is currently NULL on those proposals.
2. For Juan specifically: link the Rhino proposal so he sees it immediately.
   (Naazia stays as the contact on the proposal — we're not overwriting
   `client_reference_id`, only filling `client_id`.)

### B. Persistent fix — query by company/domain, not just `client_id`
Update the client-side proposal fetch so a registered client sees a proposal
when **any** of these is true:
- `proposals.client_id = auth.uid()` (today's behaviour), OR
- `proposals.client_reference_id` points to a `clients` row whose
  `company_name` matches the user's profile `company_name` (case-insensitive,
  trimmed), OR
- the contact's email domain matches the user's email domain.

Implement as a Postgres security-definer RPC `get_client_visible_proposals()`
that returns the union, and call it from `ProposalService` for `role = client`.
RLS on `proposals` gets a matching `SELECT` policy using the same predicate so
direct queries stay safe.

### C. Auto-link on signup / on contact creation
Add a trigger so that whenever a `clients` contact is inserted/updated, or a
new profile is created, we attempt to set `proposals.client_id` for matching
`(company_name, email_domain)` pairs. Prevents this from recurring for the
next Rhino-style customer.

### D. UI tweak
On the client dashboard empty state, if the user has a `company_name` but zero
visible proposals, show a small "Looking for projects from
*Rhino Energy (Pty) Ltd*? Contact your agent." hint — avoids confusion while
backfills propagate.

## Out of scope (call out, don't build)
- Creating a real `companies` row for Rhino + `company_members` for Juan.
  That's the cleaner long-term model, but it's a bigger migration touching
  agent dashboards too. Flag for a follow-up.
- Merging Juan's duplicate `clients` contact (`b8122310…`) with his auth
  profile. Worth doing, but separate cleanup.

## Technical notes
- Files affected: `src/services/proposal/ProposalService.ts`,
  `src/services/unified/proposals/ProposalsDataService.ts`, new RPC +
  RLS policy via migration, optional trigger function.
- The dashboard hooks (`useDashboardData`, `useDashboardMetricsByStage`) read
  from the same proposal source, so they pick up the fix automatically.
- No change needed to the agent/admin paths.

## Answer to the side question
**Is Naazia also from Rhino?** Yes — `naazia@rhinoenergy.co.za`, listed under
"Rhino Energy (Pty) Ltd" on the proposal. She's a separate person from Juan
and currently exists only as a contact, not a registered user.
