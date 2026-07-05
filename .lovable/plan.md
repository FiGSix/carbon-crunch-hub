# Reconcile homeowner stats across / and /home-owners

## Problem
Three contradictory numbers currently live on the same journey:

| Location | Value | Source |
|---|---|---|
| `/home-owners` hero (`AvatarStack`) | `1,247+ homeowners earning` | hardcoded |
| `/home-owners` ImpactStats | `1,500+ Homeowners Registered`, `R800/yr Average Annual Payout` | hardcoded |
| `/` (SocialProofSection) | `1,500+ Solar systems`, `R1.2M+ Revenue`, `28,000+ Tons CO₂` | hardcoded |
| `/` HeroSection + FAQ/JSON-LD copy | `R600–R1,000+ per year` | hardcoded prose |
| Actual DB (`user_roles` role='client') | **132 homeowners** | truth |

## Goal
1. One source of truth for the homeowner count and payout stats — pulled from the DB.
2. Keep the "R600–R1,000/yr" earnings range copy, but disambiguate it as **"typical 5kWp system"** so it doesn't read as a contradiction to the platform average.

## Changes

### 1. New hook: `src/hooks/useHomeownerStats.ts`
- React Query hook (`queryKey: ['homeowner-stats']`, `staleTime: 5 min`).
- Returns `{ homeownerCount, totalEarningsPaidZAR, co2OffsetTons, avgAnnualPayoutZAR, isLoading }`.
- Queries via the anon-safe supabase client:
  - `homeownerCount` → `user_roles` count where `role='client'`.
  - `totalEarningsPaidZAR`, `co2OffsetTons`, `avgAnnualPayoutZAR` → derived from `proposals` (signed only) using existing `UnifiedCarbonService.calculatePortfolioTotals` where a public read policy already allows it; if the anon key can't read `proposals`, add a `SECURITY DEFINER` RPC `get_public_homeowner_stats()` that returns the four aggregates (single migration, GRANT EXECUTE to anon + authenticated).
- Graceful fallback: while loading or if a value is `null`, render a skeleton — never a hardcoded default.

### 2. `src/pages/solar-rewards/ImpactStats.tsx`
- Drop the hardcoded `stats` array; build it from `useHomeownerStats()`.
- Keep the same 4 tiles/labels/icons. `Average Annual Payout` sub-label stays **"Per typical 5kWp system"** for the earnings range card, but the tile value uses the real platform average.
- Hide the tile (not show `0`) if the underlying metric is `null`.

### 3. `src/pages/solar-rewards/HeroSection.tsx`
- Replace `<AvatarStack count={1247} />` with `<AvatarStack count={homeownerCount} />` from the same hook.
- Remove the hardcoded `🔥 47 homeowners joined this week` line (no data source to back it).

### 4. `src/pages/home/SocialProofSection.tsx`
- Same hook wired into the three homepage stats: `homeowners`, `total earnings`, `CO₂ offset`.
- Change `Solar systems` label to `Homeowners` so it matches the source metric.

### 5. Clarify the "R600–R1,000/yr" copy (do NOT delete — it's a legitimate per-system estimate)
- `src/pages/home/HeroSection.tsx`: change
  `"R600-R1,000+ per year from verified carbon credits"` →
  `"R600–R1,000+ per year from a typical 5kWp system"`.
- `src/pages/SolarRewards.tsx` JSON-LD `Service.description` + FAQ answer: same "typical 5kWp system" qualifier already present in the FAQ — mirror it into the Service description string for consistency.

## Out of scope
- Live "47 joined this week" ticker (would need a weekly-signup query + design decision).
- The `LiveActivityNotification` component's fake activity feed.
- Changing the homeowner sign-up copy anywhere else.

## Technical notes
- Only a migration is needed **if** `proposals` isn't readable by `anon` for aggregation — in that case, one migration adds:
  ```sql
  CREATE OR REPLACE FUNCTION public.get_public_homeowner_stats()
  RETURNS TABLE(homeowner_count int, total_earnings_zar numeric, co2_offset_tons numeric, avg_annual_payout_zar numeric)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ ... $$;
  GRANT EXECUTE ON FUNCTION public.get_public_homeowner_stats() TO anon, authenticated;
  ```
- No new dependencies. React Query is already in the project.
