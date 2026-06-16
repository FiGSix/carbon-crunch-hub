# Second referral link for eligible Super Partners

Super Partners (SPs) currently get one `agent`-type recruitment link. When `can_create_proposals = true`, they should additionally get a `client`-type link that behaves exactly like an agent's client referral link (instant signable proposal flow, attribution to the SP).

## 1. Database migration

Single migration with two parts:

**a. Backfill existing eligible SPs**
```sql
INSERT INTO public.referral_links (owner_id, link_type)
SELECT p.id, 'client'
FROM public.profiles p
WHERE p.role = 'super_partner'
  AND p.can_create_proposals = true
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.referral_links rl
    WHERE rl.owner_id = p.id AND rl.link_type = 'client'
  );
```

**b. Update `handle_new_user()` trigger**
Re-create the function preserving all current logic. After the existing SP `agent` link insert, add a conditional `client` link insert when the new profile has `can_create_proposals = true`.

## 2. Admin toggle — `AdminSuperPartnerManagement.tsx`

In `toggleCanCreateProposals`, when flipping the flag **on**, also insert a `client` referral link for that SP:
```ts
await supabase.from("referral_links").insert({ owner_id: sp.id, link_type: "client" });
```
Rely on the existing unique index `(owner_id, link_type)` to make this idempotent (ignore duplicate-key errors). Toggling off does not delete the link.

## 3. `ReferralLinkWidget.tsx` — optional labels

Add optional props so the same component can be mounted twice with distinct copy:
```ts
interface Props {
  linkType: "client" | "agent";
  title?: string;
  subtitle?: string;
}
```
Use `title ?? "Your referral link"` for `CardTitle` and `subtitle ?? <existing default per linkType>` for `CardDescription`. No other behavior changes.

## 4. `Profile.tsx` — mount two widgets for eligible SPs

Replace the current single-widget block for SPs:

```tsx
{isAgent && (
  <ReferralLinkWidget linkType="client" />
)}

{isSuperPartner && (
  <>
    <ReferralLinkWidget
      linkType="agent"
      title="Partner recruitment link"
      subtitle="Share this link — partners who sign up are linked to your network pending admin approval."
    />
    {profile?.can_create_proposals && (
      <ReferralLinkWidget
        linkType="client"
        title="Client referral link"
        subtitle="Share this link — clients complete an assessment and receive a signable proposal instantly, attributed to you."
      />
    )}
  </>
)}

{(isAgent || isSuperPartner) && <ReferralBioCard />}
```

## 5. Out of scope (unchanged)

`/ref/:token` landing page, edge function, registration flow, attribution, click tracking, and DB schema for `referral_links` all already support `link_type='client'` regardless of owner role — no changes needed.

## Verification

1. Migration runs; query `referral_links` and confirm every SP with `can_create_proposals = true` has both an `agent` and a `client` row.
2. Sign in as an eligible SP → Profile page shows two referral widgets with distinct titles, each URL ending in a different token.
3. Admin toggles `can_create_proposals` on for an SP that lacks a client link → row appears; toggling off leaves it intact.
4. SP without the flag sees only the agent recruitment widget.
5. Visiting the SP's client link triggers the existing assessment → signable-proposal flow with the SP as owner.
