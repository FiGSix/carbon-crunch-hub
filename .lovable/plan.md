# Client Signature Engine — v1: Simpler First, Smarter Second

Your read is right. The v1 risk is overbuilding intelligence before we have the behavioural data to justify it. Below is the revised plan, fully aligned with your instruction:

> **Build the operating foundation first. Do not overbuild the intelligence layer before we have data.**

---

## Agreement on your suggestions — at a glance

| Your call | Impact | Verdict |
|---|---|---|
| Keep the four-engine model as the operating shape | Gives us structure without locking in complexity | **Adopt** |
| Replace weighted intent score with simple Hot/Warm/Cold/Dead in v1 | Ships faster, ~90% of value, no fake precision | **Adopt** |
| Promote proposal page rebuild to step 2 | Highest single conversion lever — fix the surface before driving traffic to it | **Adopt** |
| Push A/B testing to last | Low volume = fake confidence. Correct call. | **Adopt** |
| Agent warm cards are the centre of gravity | This is where conversion happens, not in more email | **Adopt — flagship feature** |
| Measure time-to-sign, viewed-unsigned, agent-touch-to-sign, stale rate, archive reasons before tuning copy | Real learnings, not vanity metrics | **Adopt** |
| Add weighted intent score only after data proves which signals matter | Earned complexity, not assumed complexity | **Adopt — deferred to phase 2** |

Net effect: same destination, lower risk, faster value, no premature optimisation.

---

## The Four Engines (unchanged shape, simplified contents)

### 1. Decision Engine
For each (client, proposal), outputs ONE action:
`send_email` · `suppress` · `create_agent_task` · `mark_stale` · `archive` · `pause`

In v1 the input is the simple bucket (below), not a weighted score.

### 2. Message Engine
Picks ONE of four template jobs, never the same job back-to-back:
1. **Reminder** — "Your proposal is still open."
2. **Clarity** — "Here's what signing means — and what it does not commit you to."
3. **Friction removal** — "Resume here, or reply with a question."
4. **Final decision** — "Keep open, or we'll archive in 7 days."

Decision-support tone throughout. No chase language.

### 3. Agent Engine *(the flagship — silent, no client touch)*
- Auto-classifies every unsigned proposal Hot/Warm/Cold/Dead
- Generates **warm cards** on the agent dashboard with last action + suggested next step + one-click call/WhatsApp/email
- Suggests agent copy (agent edits before sending — never auto-sent under agent identity)
- Weekly internal digest: top 5 to call, top 3 to close out
- Auto-escalates high-value Warm proposals sitting >21 days to admin
- Auto-hides Dead proposals from "active pipeline" KPIs

### 4. Learning Engine
SQL view + dashboard tiles. v1 measures the things that actually inform decisions:
- Time to sign
- Viewed but unsigned (count + age)
- Agent-contact-to-signature conversion
- Proposals going stale
- Archive reasons
- Proposal value by engagement level

No A/B testing in v1. No weighted score tuning in v1.

---

## v1 Classification (replaces the weighted intent score)

| Bucket | Definition | Action |
|---|---|---|
| **Hot** | Viewed proposal >1×, clicked signature area, replied, or downloaded PDF | Agent task only. **No automated email.** |
| **Warm** | Opened or viewed recently, not yet signed | Eligible for one helpful email, subject to cooldown |
| **Cold** | Sent, no meaningful engagement after 14 days | Stop reminders, route toward close-out |
| **Dead** | No engagement after 30 days, or hard negative signals (bounce, multiple no-opens) | Final close-out email, then archive |

Hard global rules (unchanged):
- Max **1 platform email per client per 7 days** across all sources
- Agent contacted client in last 7 days → **pause all platform email**
- Client signed anything in last 7 days → **pause all platform email**
- Suppression list always wins

---

## Layer B (portfolio reminder) — gated

Bi-weekly portfolio reminder fires ONLY when ALL of:
- Client has ≥2 unsigned proposals **OR** combined value ≥ threshold
- Classified Warm (not Hot, not Cold, not Dead)
- No agent-logged manual contact in last 7 days

Otherwise → routed to Agent Engine as a review task. No email.

---

## Smarter Proposal Page — "Your Proposal in 30 Seconds"

Promoted to **step 2**. Above-the-fold block answering the client's real questions:
- What am I signing?
- What do I get?
- What does it cost me?
- What does Crunch Carbon do?
- What risk am I taking?
- What happens next?

Plus: pre-filled signer details, mobile-first signature flow, sticky "Sign" button on mobile, "Ask your agent" reply button (logs as engagement event).

This is the single highest-conversion item in the plan.

---

## Day-30 close-out — soft, professional

> We don't want to keep unnecessary admin open on your side. Unless you'd like us to keep this proposal active, we'll move it to archived status in 7 days. You can request a refreshed proposal at any time.

Archived ≠ deleted. One-click reactivation for the agent.

---

## Autonomy boundaries — locked

| Scenario | Action |
|---|---|
| Cold, low-value, no engagement | Automated close-out |
| Warm, viewed, high-value | Agent task — **no automated email** |
| Multiple unsigned proposals + recent engagement | Portfolio summary email |
| Client signed anything in last 7 days | Pause all |
| No opens after 2 sends | Stop email, route to agent |
| Agent contacted in last 7 days | Pause all email |

Autonomous for low-risk actions. Human-assisted for high-value or warm opportunities.

---

## Revised Build Order (your sequence, locked)

1. **Suppression + cooldown rules** — protect the brand first
2. **Smarter proposal page** ("30-second summary") — fix the conversion surface
3. **Hot / Warm / Cold / Dead classifier** — simple buckets, no weighted score yet
4. **Agent warm cards** — flagship; turns warm engagement into human action
5. **Gated portfolio reminder** (Layer B) — only for qualified clients
6. **Soft close-out + archive flow** — keep the pipeline honest
7. **Learning dashboard** — time-to-sign, viewed-unsigned, agent-touch conversion, stale rate, archive reasons, value-by-engagement
8. **Weighted intent score** *(phase 2)* — only after the data shows which signals matter
9. **A/B testing** *(phase 2)* — only once volume justifies it

Steps 1–7 are v1. Steps 8–9 are earned complexity, deferred until the data is real.

---

## Out of scope (unchanged)

SMS/WhatsApp client outreach, in-app client notifications, discounts/incentives, AI-generated client-facing copy. Agent-facing AI copy suggestions remain in — agent edits before send.

---

## Guiding rule

> "We're not chasing you. We're helping you unlock value from something you already own."

Every template, dashboard label, and close-out line passes this test before it ships.

---

## The winning v1, in one line

**Fewer emails. Better proposal page. Clearer next action. More agent leverage. Automatic clean-up of dead opportunities.**