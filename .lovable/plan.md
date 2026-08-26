# Proposal → Cession signing: funnel review, streamlining and win-back

## What the data shows today (live database, 26 Aug 2026)

### The funnel — all active proposals (deleted/archived excluded)

| Stage | Proposals | MWp | Note |
|---|---|---|---|
| Draft (never sent) | 214 | 78.6 | Agent created, client never invited |
| Sent | 77 | 14.1 | Invite emailed |
| Delivered | 266 | 35.6 | Email confirmed delivered |
| Stale | 82 | 38.3 | No action for a long period |
| Approved | 152 | 50.9 | Signed (legacy wording) |
| Signed | 35 | 19.0 | Signed post-approval step |
| Bounced | 6 | 0.3 | Bad email address |

Unsigned, client-actionable pool (sent + delivered + stale): **425 proposals ≈ 88 MWp**. Including drafts never sent: **≈ 167 MWp** — this is the ~161 MWp the user quoted.

### Key conversion findings

1. **The biggest leak is drafts, not signing.** 214 proposals (78.6 MWp — nearly half the pipeline) were created but the invitation was never sent. No client ever saw them. This is an agent-behaviour problem, not a signing-friction problem.
2. **Half the invited clients open the link, then nothing.** 207 of 425 unsigned proposals have `invitation_viewed_at` set — the client clicked — yet never signed. So the drop-off happens **between opening the acceptance page and completing the ceremony**.
3. **Engagement tracking is effectively blind.** Only 2 of those 425 proposals have `engagement_count > 0`, contradicting the 207 views. The `increment_proposal_engagement` signal is not firing reliably, so we currently cannot see *where* on the page people abandon.
4. **The pipeline is old.** Average age of unsigned proposals: sent ≈ 156 days, delivered ≈ 163, stale ≈ 272. These clients were invited under the old Rev-8 wording and the old typed-name flow; many links may never have been revisited.
5. **The master-signature model has barely started.** Of 198 signature records, exactly 1 is a `client_cession_signatures` master — everything else is legacy per-proposal signing. The one-signature-covers-all-proposals benefit has not yet reached the base.
6. **Emails deliver fine; clicks are rare.** 1,418 delivered vs 23 clicked across all platform email — links in email are not compelling or not prominent.

### How the current flow works (post Rev-6 rebuild)

Agent creates proposal → sends invitation email with token link → client opens acceptance page → scroll-to-bottom gate on live agreement text → draws signature (typed-name removed) → master `client_cession_signatures` row created → `pdf-lib` splices Rev 6 pages verbatim + overlays + party/site page → PDF stored, emailed to client → proposal moves to signed, onboarding kicks off. Repeat proposals for the same client inherit the master signature with no ceremony.

## What gets built

### 1. Funnel instrumentation (measure before streamlining)

- Fix `increment_proposal_engagement` so acceptance-page opens are actually counted (verify the RPC is called from the token page and that RLS/grants allow it).
- Add lightweight step events on the acceptance page (opened → scrolled-to-bottom → signature-drawn → submitted) written via the existing token RPC path, so we can see the exact abandonment point per proposal.
- Surface a small funnel card on the admin Pipeline Analytics page: sent → opened → started signing → signed, with MWp at each stage.

### 2. Win-back campaign for the 425 unsigned proposals (~88 MWp)

- Build the segment from live data: proposals in sent/delivered/stale with a client email, excluding clients who already hold a master signature (their proposals auto-inherit via `ensure-proposal-agreement` — those get their document with no ceremony at all).
- Send via the existing broadcast infrastructure (Resend, category-based, tracked): one personalised email per client with a fresh token link per proposal, leading with "one signature covers all your sites" for multi-proposal clients.
- A two-step reminder sequence (day 7, day 21) for non-openers/non-signers, using the engagement events above to stop the sequence the moment someone signs.
- Report back: deliveries, opens, clicks, signings attributed to the campaign.

### 3. Draft-pipeline rescue (78.6 MWp)

- Admin list of the 214 draft proposals grouped by agent with client email presence, so Shaun/Johanita can nudge agents or bulk-send invitations where the agent agrees.
- No auto-send — drafts were never shown to a client, so sending needs a human decision per agent.

### 4. Friction reductions in the ceremony itself

- Deep-link straight to the signing section on return visits (skip re-reading if a partially-completed state exists — scroll gate still applies to the live revision text).
- Show the client's name/company pre-filled on the party-details step so the only action is drawing the signature.
- WhatsApp fallback: agent-facing "Send reminder via WhatsApp" button on unsigned proposals using the tracked token link, mirroring the referral-share pattern already in the app.

## Technical notes

- Funnel events: new lightweight table `proposal_signing_events` (proposal_id, event, token-scoped, created_at) with GRANTs + RLS (service role write, admin read), written from a security-definer RPC so anonymous token holders can log events safely.
- Win-back reuses `broadcast_campaigns`/`broadcast_recipients` + a new segment resolver for unsigned-cession clients; suppression and unsubscribe rules apply as usual.
- `ensure-proposal-agreement` already handles inheritance — the campaign link simply needs to hit the existing acceptance route.
- No changes to the legal document or PDF pipeline; Rev 6 stays the live source.

## Verification

1. Open a test token link, confirm each step event lands in `proposal_signing_events` and `engagement_count` increments.
2. Dry-run the segment query and reconcile the count against the 425 figure above.
3. Send the win-back email to an internal test client with two unsigned proposals: one email, both links; sign one, confirm the second inherits via master signature and the reminder sequence stops.
4. Funnel card on Pipeline Analytics renders the same numbers as the SQL above.
