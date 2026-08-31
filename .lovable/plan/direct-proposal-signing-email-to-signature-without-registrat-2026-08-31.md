# Direct proposal signing — email to signature without registration

## What I found in the current journey

- The proposal email (`send-proposal-invitation`) links to `/proposals/:id?token=…` — the **full proposal view**, not the signing page. Its "What happens next?" copy explicitly tells the client they must "create a quick account or sign in".
- `/proposals/:id` gates every action behind auth: the accept/decline buttons only work when a user is logged in, and clicking them swaps the page for a register/login form ("Almost there! Complete your account to respond").
- `/proposals/:id/accept` — the real signing ceremony — **already works fully with just a token**, logged out. It loads the proposal via `get_proposal_by_token_direct`, renders the live Rev 6 agreement, enforces the scroll gate, requires a drawn signature, and posts to the `accept-proposal` edge function, which accepts a token instead of a session.
- `accept-proposal` already: validates status, prevents double signing, handles master-signature inheritance (via the `propagate_master_agreement` trigger), generates and stores the PDF, emails the signed copy, and creates the `project_onboarding` record.
- Decline has **no token path** — `rejectProposal` writes to `proposals` directly under RLS, so it needs a session.
- Onboarding (`/onboarding/:projectId`) is an authenticated route.

**So the conversion blocker is almost entirely the email link plus the auth gate on the view page — not the signing engine.** No identity, RLS or signature rework is needed.

## What will change

### 1. Proposal email (`send-proposal-invitation`)
- Primary button **Accept and sign** → `/proposals/:id/accept?token=…` (straight to signing).
- Secondary **Decline proposal** → `/proposals/:id/decline?token=…`.
- Small text link **View full proposal** → the existing `/proposals/:id?token=…`.
- New opening block: *Your solar carbon income proposal is ready* with the three steps **Review → Sign → Onboard**.
- "Your proposal in 30 seconds" card built from the values already fetched for that proposal (client/company, site, capacity, annual generation and credits, client share, estimated annual income, term income, reference). Fields with no value are omitted rather than invented — no new calculation logic.
- Client income is the visual focus. Estimate disclaimer retained. Remove the "create a quick account" copy and fix the spelling/grammar issues in the current template.
- Plain-text alternative added; inline styles only, using the existing Crunch Carbon palette already in the template and `_shared/brand-email.ts`.

### 2. Signing page (`/proposals/:id/accept`)
- Add a compact **"You are accepting the following proposal"** confirmation strip at the top (client/company, site, capacity, annual income, term income, reference) above the existing agreement.
- Everything below it stays as-is: Rev 6 renderer, prefill, scroll gate, drawn signature, authority confirmation checkbox, `accept-proposal` call. The consent line is updated to the exact wording requested ("…and confirm that I am authorised to sign for the named party") and the button becomes **Sign and accept proposal**.
- Already-signed and inherited-agreement states keep their current behaviour (no second ceremony).

### 3. Success and onboarding handoff
- Replace the current modal with a success screen: *Your agreement has been signed successfully*, confirming the signed copy was emailed.
- **Start onboarding** → if there is no session, sends a magic link (existing Supabase passwordless flow) with a redirect straight to `/onboarding/:proposalId`; if already signed in, navigates there directly.
- **I'll do this later** → a plain confirmation, no dashboard detour.
- Signing success is recorded before any of this, so a failed email or redirect never loses the signature.

### 4. Decline (`/proposals/:id/decline?token=…`)
- New lightweight page. Opening it does **not** decline anything — it shows a confirmation screen with an optional reason (Not interested / Income too low / Need more information / Not authorised to sign / Project details incorrect / Already participating elsewhere / Other) and a "Please contact me" option.
- Submission goes through a narrow token-authorised edge function that validates the token server-side, resolves the proposal itself, applies the existing rejected status, records the reason as an audit/engagement event and notifies the agent. No schema change.

### 5. Tracking
Reuse existing engagement events; fill only the gaps: accept-link opened, signing page opened, agreement confirmed, signature completed, decline confirmed, onboarding started.

## Technical notes

- No database migration. Decline reason and contact request are stored as audit/engagement events.
- One new edge function (`decline-proposal`) using the same token-validation pattern as `accept-proposal`: token hashed/validated server-side, proposal resolved server-side, status/expiry checked, single allowed action, minimum data returned, replay-safe.
- No RLS changes, no new anon table grants, no service-role exposure, no changes to Rev 6, calculations, master-signature rules, PDF generation or storage.
- Idempotency: repeated submissions rely on the existing signed-status short-circuit in `accept-proposal`, plus a submit lock on the decline action.

## Verification before I report back

- End-to-end logged-out run: send a test proposal → open the email → accept and sign → confirm exactly one signature, one agreement, one PDF, one onboarding record, correct status and audit events.
- Decline run: opening the link changes nothing; confirming records the reason and creates no signature or onboarding.
- Already-signed link, expired/invalid/tampered token, and cross-proposal token attempts fail safely.
- Existing authenticated agent/admin/client access, signed downloads, master-signature inheritance and onboarding are retested.
- Desktop and mobile renders captured for the email, signing page, decline page, success page and invalid-link state.
- Requirements matrix with PASS/BLOCKED for each item in the brief.

## Not in scope

Rev 6 content, calculations, global auth architecture, agent builder, historical signed records, win-back campaigns, analytics rebuild, unrelated UI.
