# Platform Broadcasts — email your users from inside the platform

## What you get

An admin-only "Communications" area where you compose an email once, choose who receives it, preview it, send a test to yourself, then send to the whole audience. Delivery, opens, clicks, bounces and unsubscribes are tracked per campaign.

Audiences you can pick from (combinable):
- All users, All partners (agents + super partners), Super partners only, Clients only, Admins only
- Newsletter subscribers only (anyone opted in, including non-users later)
- Partners of a specific super partner; clients of a specific partner
- Clients with a project at a given onboarding stage (e.g. "audit ready") — useful for audit comms
- A manual list of pasted email addresses

Every send respects opt-outs and your existing suppression list, and non-essential mail carries a one-click unsubscribe link. Transactional mail (invitations, proposals, agreements, password resets) is unaffected and never unsubscribable.

## Why this approach

You already send email through Resend from `noreply@crunchcarbon.com`, and `resend-webhook` already records deliveries, opens, clicks and bounces into `email_events`, with a `client_email_suppressions` table for blocked addresses. Rather than adding a separate mailing tool (Mailchimp etc.) with a second copy of your user list that drifts out of date, this reuses the same sender, the same webhook, and the live database as the audience source — so a new partner is reachable the moment they sign up.

Current reachable base: 274 profiles — 111 agents, 6 super partners, 154 clients, 4 admins.

## Compose experience

- Subject, preheader, and a rich-text body with headings, bold, links, bullet lists and images
- Reusable branded wrapper (Crunch Carbon header, yellow accents, footer with address + unsubscribe) so every send looks consistent
- Merge fields: first name, company name, partner name — with fallbacks when data is missing
- Optional call-to-action button with a tracked link
- Save as draft, duplicate a past campaign, schedule for a future date/time

## Sending and safety

- Recipient list is resolved and previewed with an exact count before you confirm
- "Send test to me" before any real send
- Sends run in the background in batches with rate limiting, so a 300-recipient send never times out; progress shows live
- Automatic exclusion of suppressed, bounced and unsubscribed addresses, plus de-duplication
- A send can be cancelled while still in progress
- Per-campaign report: sent, delivered, opened, clicked, bounced, unsubscribed, with the recipient-level list

## Newsletter subscription

- Subscribe field in the site footer for visitors who are not users
- "Email preferences" section in every user's profile with toggles per category (Newsletter, Product & partnership updates, Audit & project notices)
- Public unsubscribe page reachable from the footer link without logging in

## Technical outline

Database (new tables, all admin-scoped RLS with explicit grants):
- `email_campaigns` — subject, preheader, body HTML, audience definition (JSONB), category, status (draft/scheduled/sending/sent/cancelled), schedule time, counts, created_by
- `email_campaign_recipients` — one row per resolved recipient with email, user_id, personalisation snapshot, send status, Resend `message_id`, error
- `email_subscribers` — non-user newsletter signups (email, confirmed_at, unsubscribed_at, token)
- `email_preferences` — per-user category opt-outs
- Postgres function `resolve_campaign_audience(definition jsonb)` returning the recipient set, used for both the preview count and the actual send

Edge functions:
- `send-campaign` — resolves audience, snapshots recipients, sends via Resend in batches with `waitUntil`, writes per-recipient status and `message_id`
- `campaign-unsubscribe` — public token endpoint, writes the opt-out and the suppression row
- `resend-webhook` extended to match `message_id` against `email_campaign_recipients` so opens/clicks/bounces roll up per campaign (today it links to proposals only)
- A scheduled trigger to pick up campaigns whose send time has arrived

Frontend (admin): `/communications` with campaign list, composer, audience builder with live count, test send, and a report view. Plus footer subscribe field, profile email-preferences panel, and a public `/unsubscribe` page.

Deliverability: sends continue from your verified `crunchcarbon.com` domain, include `List-Unsubscribe` headers, and marketing sends use a distinct from-name so bulk mail never harms transactional reputation.

## Suggested build order

1. Tables, audience resolver, preferences and unsubscribe (foundation)
2. `send-campaign` edge function with batching and suppression handling
3. Admin composer, audience builder and send flow
4. Reporting, webhook roll-up, scheduling, and the public newsletter signup
