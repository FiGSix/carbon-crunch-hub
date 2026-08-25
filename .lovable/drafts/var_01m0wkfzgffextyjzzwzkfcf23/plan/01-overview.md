# UX, Motion & Interaction Polish

A polish layer over the existing dashboards. No changes to roles, permissions, proposal flow, onboarding logic or business rules — the same hooks and data, presented with clearer hierarchy, purposeful motion and one-click paths from insight to action.

## Partner dashboard — the walkthrough

**On arrival** the Partner sees one wide summary band: Portfolio MWp, Audit Ready MWp, Active proposals, Signed awaiting onboarding, Potential value. Numbers count up once, briefly, from a lower value to the real one — so the eye lands on the figures and registers them as live rather than static.

**The eye moves next** to a compact "Since your last visit" strip directly under the band: `+1.8 MWp added · 2 agreements signed · 1 project reached Audit Ready`. It fades in on first load, then stays still. No modal, ever. If nothing changed, the strip is not rendered at all.

**The primary CTA** is a single Next Best Action card — one ranked item, not a wall. It reuses the existing warm-card ranking: highest value × longest waiting. It carries a quiet "Highest-value opportunity" label, slightly stronger contrast and a single button (Follow up / Complete onboarding / Chase signature). Everything below it — portfolio review, closeout queue, stage metrics — stays visually quieter.

**Clicking it** either enters the existing workflow (proposal, onboarding detail) or, for aggregate metrics like "6 proposals awaiting acceptance", opens a right-hand slide-over listing client, date, MWp, value, days outstanding and a recommended action per row. The dashboard stays underneath as home base; picking a row navigates for deeper work.

**Feedback** is a toast that ties action to outcome, not a generic "Saved": *Agreement signed — 2.8 MWp can now move into onboarding.* The affected card's number and progress bar animate to their new values in place, so the confirmation and the visible change agree.

**Where animation is used, and why**
- Count-up on metric values (~600ms, ease-out, single pass): makes a changed figure noticeable without a slot-machine effect.
- Progress bars tween to their new percentage: gives completion a felt sense of movement.
- Stage badge cross-fades on change (old fades, new emphasises): explains a transition instead of teleporting.
- Audit Ready: a restrained highlight sweep across the card, then a confirmation line with the MWp delta. Slightly more emphasis than a routine save — no confetti, no bounce, no sound.
- Milestones (first signed, first Audit Ready, 10/25/50/100 MWp): a card fades in, the number gently scales up and settles. Shown once per milestone, dismissible, never blocking.
- Hover on desktop: 1–2px lift, border emphasis, and a detail line plus action link fading in. At rest the card stays clean.

All motion is short, settles, and never loops. Every animation is wrapped so `prefers-reduced-motion: reduce` collapses it to an instant state change — values, progress and stages remain fully readable with motion off.

**When no action is required**, the Next Best Action slot becomes: *You're all caught up — no onboarding actions need your attention.* Quiet, no invented tasks.

## Client dashboard — calmer by design

Clarity → confidence → completion. On arrival the Client sees their project(s) with a single progress-to-Audit-Ready indicator and a plain statement of state: what Crunch Carbon is doing, what is outstanding from them. If something is required, exactly one action card appears with a direct link to that step. If nothing is required, the surface goes quiet: *Nothing needed from you right now — we'll email you if that changes.* Completed steps collapse into a checked list rather than persisting as calls to action. Same motion vocabulary, lower intensity: progress tween, stage cross-fade, one Audit Ready moment. No streaks, badges, points or engagement prompts.
