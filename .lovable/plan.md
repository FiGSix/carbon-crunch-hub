
# Fix: FLM Brickworks and Cornubia Failing Validation

## The Problem

Both projects have `installer_email` set to **"To be confirmed"** -- a placeholder that was entered when the actual installer email was not yet known.

The client-side validation (which runs before submission) treats any non-empty value in `installer_email` as something that must pass an email format check. "To be confirmed" is not a valid email, so validation fails silently with an error that says "Invalid email format" on the installer email field.

The tricky part: the validation summary shows errors, but the installer email field is in the "optional fields" section and is likely scrolled out of view or easy to overlook. You see "validation error, check the marked items" but the marked field is not obvious.

## Why This Only Affects These Projects

Most other projects either have a real email in `installer_email` or have it set to `null`/empty. These two legacy projects had placeholder text entered instead.

## The Fix

**File:** `src/lib/validation/onboardingSchema.ts`

Change the `installer_email` validation (lines 124-127) so that it only enforces email format when the value actually looks like an attempted email address. If the value doesn't contain an `@` symbol, skip validation entirely since this is an optional field and placeholder text like "To be confirmed" or "TBC" should not block submission.

**Before:**
```typescript
case "installer_email":
  if (value && typeof value === "string" && value.trim() !== "") {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(value)) return "Invalid email format";
  }
  break;
```

**After:**
```typescript
case "installer_email":
  if (value && typeof value === "string" && value.trim() !== "" && value.includes("@")) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(value)) return "Invalid email format";
  }
  break;
```

This single-character-level change (`&& value.includes("@")`) means:
- Real email addresses still get validated for correct format
- Placeholder text like "To be confirmed", "TBC", "N/A" passes through without blocking
- Empty/null values continue to pass (field is optional)

## Scope

| Layer | Change |
|---|---|
| `src/lib/validation/onboardingSchema.ts` | Relax installer_email validation to skip format check on non-email placeholder text |
| Database | None |
| Other files | None |

One line change, one file. Both projects will pass validation immediately after deployment.
