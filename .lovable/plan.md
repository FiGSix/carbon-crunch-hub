

# Add Sineng to Inverter Brand Dropdowns

## Summary
Add "Sineng" as a new inverter brand option to both dropdown menus in the onboarding section. Note that "Ario" is already present in both dropdowns.

---

## Current State

| Dropdown Location | Ario | Sineng |
|-------------------|------|--------|
| Inverter Details (OnboardingTab.tsx) | Present | Missing |
| Data Access Provider (DataAccessTab.tsx) | Present | Missing |

---

## Changes Required

### 1. OnboardingTab.tsx - Inverter Brand Dropdown
Add "Sineng" in alphabetical order between "SigEnergy" and "SMA" (around line 776):

```tsx
<SelectItem value="SigEnergy">SigEnergy</SelectItem>
<SelectItem value="Sineng">Sineng</SelectItem>  // NEW
<SelectItem value="SMA">SMA</SelectItem>
```

### 2. DataAccessTab.tsx - Data Access Provider Dropdown
Add "Sineng" in alphabetical order between "SigEnergy" and "Sivula" (around line 357):

```tsx
<SelectItem value="SigEnergy">SigEnergy</SelectItem>
<SelectItem value="Sineng">Sineng</SelectItem>  // NEW
<SelectItem value="Sivula">Sivula</SelectItem>
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/ProjectOnboardingDetail/OnboardingTab.tsx` | Add Sineng after SigEnergy (line 776) |
| `src/pages/ProjectOnboardingDetail/DataAccessTab.tsx` | Add Sineng after SigEnergy (line 357) |

---

## No Database Changes Required
This is a UI-only update to add a new option to existing dropdown menus.

