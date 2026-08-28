# One source of truth for "which company is this person in"

## What I found (verified against the live data)

Thamsanqa Nkosi (thami@moolmangroup.co.za) currently has **three separate company records**, and they disagree:

| Store | Value today |
|---|---|
| `client_company_members` (membership) | active, `account_admin` of **Moolman Group (Pty) Ltd** |
| `clients.client_company_id` (his client record) | still set to **Moolman Group (Pty) Ltd** |
| `clients.company_name` (free-text) | empty |
| `profiles.company_name` (free-text) | empty |

So the unlink did **not** actually detach him — both real links are still in place, even though the dialog reported success. And the two pages read different stores:

- **User Management** reads the membership table (and falls back to `profiles.company_name`) → shows "Moolman Group".
- **My Clients** is fed by the `get_agent_clients_paginated_admin` function, which returns `clients.company_name` only and ignores `client_company_id` entirely → shows blank.

There is no central resolver, so the answer to "who is this person's company" depends on which page you open. The same split affects partners: Partner pages read `company_members` + `companies`, while other views fall back to the free-text `profiles.company_name`.

## The fix

### 1. One rule for resolving a company

Define a single precedence used everywhere:

```text
Client person : client_company_members -> clients.client_company_id -> free text
Partner person: company_members        -> free text (legacy, shown as "unverified")
```

Implement it once in the database (a small helper view/function that returns, per person, the resolved company id, name, type and whether it came from a real link or legacy free text), and have both the user-management query and the client-list function read it. My Clients starts showing the real client company name instead of blank.

### 2. Unlink must clear every link, atomically

Replace the current partial delete with a single server-side operation that, for one person:
- removes the `client_company_members` / `company_members` row,
- clears `clients.client_company_id` on their client record(s),
- clears the legacy free-text company name so it can't resurface as a ghost value,
- errors loudly if nothing was actually removed (no more false "Unlinked" toast).

Linking gets the mirror treatment: membership + client record + display name written together, replacing any previous link rather than stacking a second one.

Then re-run the unlink for Thamsanqa so his records are clean.

### 3. Same actions in both places

Give a client person the same action menu on My Clients as on User Management (view company, manage company link, unlink, edit client, delete), and the same for a partner person across Partner Management and User Management, driven by one shared component so the two can't drift again. Actions stay admin-only where they already are.

### 4. Refresh together

After any link/unlink, invalidate the shared query keys for users, clients, partners and company details so all open pages show the new state without a manual reload.

## Technical notes

- New SQL: a `resolve_person_company(...)` security-definer helper plus `admin_link_person_to_company` / `admin_unlink_person_from_company` functions that do the multi-table write in one transaction and raise on a no-op.
- `get_agent_clients_paginated_admin` (and the non-admin/paginated siblings) select the resolved company name instead of `clients.company_name`; return `company_type` too.
- Frontend: `ManageCompanyLinkDialog.tsx` calls the new RPCs instead of doing three separate table writes; a new shared `PersonActionsMenu` used by `UserManagementTable.tsx`, the My Clients table/cards, and `PartnersTable.tsx`; `UserManagementTable`'s hand-rolled membership merge is deleted in favour of the resolver.
- No new tables. Existing admin RLS already permits the writes; the new functions run as definer with an explicit admin check.

## Verification

Unlink Thamsanqa, then confirm membership row gone, `clients.client_company_id` null, and both My Clients and User Management showing no company. Re-link him and confirm both pages show "Moolman Group (Pty) Ltd" immediately.
