## Block List — QA Review (Steps 1–7)

Reviewed: DB layer, admin UI, suppression service, in-app invite path, portfolio outreach path, public eligibility funnel, public contact funnel.

### Overall verdict
**Working end-to-end.** All seven surfaces are wired up correctly and the silent-block contract holds on the public funnel. Five issues found — none are blockers; one is a real UX leak worth fixing before release, the rest are polish.

---

### Step-by-step results

| # | Area | Status | Notes |
|---|------|--------|-------|
| 1 | DB: table, enum, RPC, RLS, unique index | ✅ Pass | Enum values (`manual / fatigue / bounce / complaint / unsubscribe / invalid`) match admin UI options exactly. Policies: SELECT/INSERT/DELETE all admin-only. `lower(email)` unique index prevents dupes. |
| 2 | `/admin/blocked-emails` page + sidebar + route | ✅ Pass | Admin-only `PrivateRoute`, sidebar entry under admin section, list/add/remove + Suggested blocks panel all render. |
| 3 | `emailSuppressionService.isEmailSuppressed` | ✅ Pass | Calls `is_client_email_suppressed` RPC; fail-open (returns `false` on RPC error) — intentional, matches existing pattern. |
| 4 | In-app invite (`useProposalInvitations`) | ✅ Pass | Block check runs before edge call. Resend delegates to the same handler, so resend is covered too. Clear destructive toast on block. |
| 5 | Portfolio outreach (`PortfolioReviewSection`) | ✅ Pass | Mailto click blocked with toast pointing to Admin → Blocked Emails. |
| 6 | Public `send-eligibility-proposal` | ⚠️ Pass with leak (Bug #1) | Silent block runs before client upsert, proposal insert, and Resend call. Frontend toast is technically wrong (see Bug #1). |
| 7 | Public `send-contact-email` | ✅ Pass | Silent block runs before DB insert and Resend; returns `success:true` with the same message the happy path uses. |

---

### Bug list

**Bug #1 — Eligibility modal shows misleading "Check your email" toast on silent block** *(medium, fix recommended)*
- `EligibilityModal.handleSubmit` ignores `data.blocked` and always shows: *"Proposal sent! Check your email for details."*
- For a blocked visitor, no email is sent → they refresh inbox, find nothing, and may probe by retrying with a tweaked email. Spec called for a neutral *"Thanks, we'll be in touch"* style message.
- **Fix:** when `data?.blocked === true`, show a generic acknowledgement toast (e.g. *"Thanks — we've received your details and will be in touch."*) instead of the email-confirmation copy. Keep `handleClose()`.

**Bug #2 — Inconsistent confirm pattern in admin UI** *(low, polish)*
- Unblocking uses `window.confirm()`; one-click "Block" on a Suggested row has no confirmation. Either standardise on shadcn `AlertDialog` for both, or accept the asymmetry. Existing admin pages use `AlertDialog`.

**Bug #3 — No audit trail on removal** *(low)*
- `created_by` is captured on insert, but DELETE leaves no trace of who unblocked or when. If audit matters, soft-delete (`deleted_at`, `deleted_by`) or log to `proposal_automation_log` / a new `admin_audit_log` row. Out of v1 spec; flag for product.

**Bug #4 — Suggested blocks query relies on `(supabase as any)` cast** *(low)*
- `useSuggestedBlocks` and `useBlockedEmails` bypass the generated types via `(supabase as any)`. View columns were verified live (`client_email`, `client_name`, `unsigned_count` present), but any future view change will fail silently at runtime. Regenerate Supabase types or add an explicit interface guard.

**Bug #5 — Inconsistent blocked response shape between edge functions** *(very low)*
- `send-contact-email` returns `{ success:true, blocked:true, message:"..." }`; `send-eligibility-proposal` returns `{ success:true, blocked:true }`. Harmless today (each frontend handles its own toast) but worth aligning when Bug #1 is fixed.

---

### Out of scope but verified safe
- **Agent invitations** (`send-agent-invitation`) are not affected — block list is client-only by design.
- **`CreateProposal` / `SubmitProject`** require login, so blocked external emails can't reach them.

### Recommended action
Approve plan → in build mode I'll fix **Bug #1** (the only user-visible leak), align response shape from **Bug #5**, and leave #2/#3/#4 documented for product to triage.
