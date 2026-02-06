

## Remove Partner Logos Section

Remove the "Trusted by Leading Solar Industry Partners" section from the /home-owners page due to inconsistent logo sizing and colors.

---

## Changes Required

| File | Action | Description |
|------|--------|-------------|
| `src/pages/SolarRewards.tsx` | Update | Remove PartnerLogos import and component usage |

---

## Implementation

**In `src/pages/SolarRewards.tsx`:**

1. Remove the import statement:
```typescript
import { PartnerLogos } from "./solar-rewards/PartnerLogos";
```

2. Remove the component from the JSX (currently between HeroSection and ImpactStats):
```typescript
<PartnerLogos />
```

---

## Result

The page flow will become:
```text
Header
  ↓
HeroSection
  ↓
ImpactStats (moves up to directly follow hero)
  ↓
HowItWorks
  ↓
... rest of page
```

The `PartnerLogos.tsx` component file and the `public/partner-logos/` assets folder can optionally be deleted later if no longer needed, or kept for future use when properly sized and color-matched logos are available.

