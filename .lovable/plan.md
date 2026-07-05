## Goal
Remove the fabricated "Just registered" pop-up on `/home-owners`. The names, cities, and timestamps are hardcoded fiction, which is a credibility/compliance risk next to real Verra and POPIA claims. Wiring it to real sign-ups would leak PII (first name + city of registered homeowners), so removal is the safer option.

## Changes

1. **`src/pages/SolarRewards.tsx`**
   - Remove the `import { LiveActivityNotification }` line.
   - Remove the `<LiveActivityNotification />` render.

2. **`src/components/solar-rewards/LiveActivityNotification.tsx`**
   - Delete the file — no other references exist.

## Out of scope
No changes to the real dynamic homeowner stats (`useHomeownerStats`), certifications, or any other section of the page.