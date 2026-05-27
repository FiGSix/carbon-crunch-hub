## Problem

The WhatsApp "Click to chat" links from the dashboard warm cards open WhatsApp but show:
> "This link couldn't be opened. Check the link and try again."

## Root cause

In `src/components/dashboard/sections/AgentWarmCards.tsx` the link is built as:

```ts
`https://wa.me/${card.client_phone.replace(/\D/g, "")}?text=${msg}`
```

`wa.me` requires a phone number in full international format (digits only, including the country code, no `+`, no leading `0`). South African numbers stored as `082 123 4567` or `0821234567` strip down to `0821234567`, which `wa.me` rejects — producing the exact error the user saw. Numbers stored as `+27 82 123 4567` work because they strip to `27821234567`.

So the bug is: we don't normalise the phone to E.164 digits before handing it to `wa.me`, and we don't guard against numbers that obviously can't be dialled internationally.

## Fix

Frontend-only, no business logic change.

1. Add a small helper `src/utils/phone/toWaMeDigits.ts`:
   - Strip everything except digits and a leading `+`.
   - If the input starts with `+`, return the digits after `+`.
   - If it starts with `00`, drop the `00` and return the rest.
   - If it starts with a single `0` and we have a default country, drop the `0` and prepend the country code (default `27` for South Africa, since this is a ZA-based product — easy to swap later via a constant).
   - If it already looks like an international number (10–15 digits, doesn't start with `0`), return as-is.
   - If we can't confidently produce a valid international number, return `null`.

2. In `AgentWarmCards.tsx`:
   - Use the helper to compute `waDigits`.
   - Only render the WhatsApp button when `waDigits` is non-null.
   - Build the link as `https://wa.me/${waDigits}?text=${msg}`.
   - Leave `tel:` and `mailto:` untouched (those tolerate local formats).

3. No DB changes, no other call sites touched in this pass. (A follow-up could normalise stored phone numbers, but that's out of scope here.)

## Technical details

- New file: `src/utils/phone/toWaMeDigits.ts` (pure function, unit-testable).
- Edited file: `src/components/dashboard/sections/AgentWarmCards.tsx` — replace the inline `.replace(/\D/g, "")` with the helper and gate the button render on a valid result.
- Default country code constant lives in the helper file for now; can be lifted to config later.

## Out of scope

- Backfilling/normalising existing `clients.phone` values.
- Changing how phone numbers are captured on input forms.
- Any change to `tel:` / `mailto:` behaviour or to the message copy.
