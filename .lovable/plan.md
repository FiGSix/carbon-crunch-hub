

## Fix: Groenheuwel Solar Validation Error -- Battery Capacity Limit Too Low

### Problem
The "Groenheuwel Solar" project has a battery capacity of **1,062 kWh**, which exceeds the hardcoded frontend validation limit of **1,000 kWh**. This causes the "Please fix the highlighted errors before submitting" message even though all data is correct for this large commercial installation.

### Root Cause
The battery capacity validation in `src/lib/validation/onboardingSchema.ts` has an arbitrary 1,000 kWh maximum that is too restrictive for commercial-scale projects.

### Fix

**File: `src/lib/validation/onboardingSchema.ts`**

Increase the battery capacity maximum from 1,000 kWh to 50,000 kWh in two places:

1. The Zod schema (`batteryDetailsSchema`): Change `.max(1000, ...)` to `.max(50000, "Maximum 50,000 kWh")`
2. The `validateField` function (`battery_capacity_kwh` case): Change the `capacity > 1000` check to `capacity > 50000` with updated message

This accommodates commercial and utility-scale battery installations while still providing a sensible upper bound to catch data entry errors.

No database changes needed -- the data is already correct.

