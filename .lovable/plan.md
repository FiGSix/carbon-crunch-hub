

# Add Battery Toggle to Onboarding Form

## Summary
Add a "Do you have a battery?" Yes/No toggle to the Battery Details section, similar to the existing Operations & Maintenance section. When "No" is selected, the additional battery fields are hidden.

---

## Current State
- **O&M Section:** Has `has_maintenance_agreement` boolean field that conditionally shows term/cost/document fields
- **Battery Section:** Always shows all fields with "(if you have a battery)" hint in the title

---

## Solution

### 1. Database Migration
Add a new nullable boolean column to `onboarding_fields`:

```sql
ALTER TABLE onboarding_fields 
ADD COLUMN has_battery boolean DEFAULT NULL;
```

### 2. UI Changes (OnboardingTab.tsx)

Update the Battery Details card to:
- Add a Yes/No Select dropdown: "Do you have a battery?"
- Conditionally render battery fields only when `has_battery === true`
- Update the section status icon logic (similar to O&M pattern)

**New UI Pattern:**
```text
┌─────────────────────────────────────────────────┐
│ Battery Details                           [●]   │
├─────────────────────────────────────────────────┤
│ Do you have a battery?                          │
│ ┌─────────────────────────┐                     │
│ │ Select...           ▼   │                     │
│ └─────────────────────────┘                     │
│                                                 │
│ [If "Yes" selected, show:]                      │
│   • Battery Brand                               │
│   • Total Battery Capacity (kWh)                │
│   • Total Cost Installed (Rands)                │
└─────────────────────────────────────────────────┘
```

### 3. Status Icon Logic

| State | Icon |
|-------|------|
| `has_battery` is null/undefined | Orange (incomplete) |
| `has_battery === false` | Green (complete - no battery needed) |
| `has_battery === true` and all fields filled | Green (complete) |
| `has_battery === true` and fields missing | Orange (incomplete) |

---

## Files to Modify

| File | Changes |
|------|---------|
| Database migration | Add `has_battery` boolean column |
| `src/types/onboarding.ts` | Add `has_battery: boolean \| null` to OnboardingFields interface |
| `src/pages/ProjectOnboardingDetail/OnboardingTab.tsx` | Update Battery Details card with conditional rendering |

---

## Expected Behavior

1. **New projects:** User must select Yes/No before section is considered complete
2. **Existing projects (null value):** Section shows as incomplete until user makes a selection
3. **"No" selected:** Section immediately shows as complete (green checkmark)
4. **"Yes" selected:** Must fill in battery brand, capacity, and cost for completion

