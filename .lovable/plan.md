
# Improved Error Handling for Proposal Signing

## Problem Analysis

When clients like Anthony try to sign the Abendruhe proposal and encounter an error (e.g., expired invitation token), they see a generic message:

**"Edge Function returned a non-2xx status code"**

This is unhelpful and confusing. The edge function actually returns descriptive error messages like "Invitation link has expired", but the frontend doesn't extract them properly.

## Root Cause

The Supabase JavaScript client throws a `FunctionsHttpError` when an edge function returns a non-2xx status. The actual error details are stored in `error.context` (a Response object), but the frontend only reads `error.message` which contains the generic text.

```text
Current Flow:
+-------------------+     +-------------------+     +------------------+
| Edge Function     | --> | Supabase Client   | --> | Frontend         |
| Returns:          |     | Wraps as:         |     | Displays:        |
| {error: "Expired"}|     | FunctionsHttpError|     | "non-2xx status" |
| status: 400       |     | .context=Response |     |                  |
+-------------------+     +-------------------+     +------------------+

Proposed Flow:
+-------------------+     +-------------------+     +------------------+
| Edge Function     | --> | Supabase Client   | --> | Frontend         |
| Returns:          |     | Wraps as:         |     | Parses context:  |
| {error: "Expired"}|     | FunctionsHttpError|     | Shows "Expired"  |
| status: 400       |     | .context=Response |     |                  |
+-------------------+     +-------------------+     +------------------+
```

## Solution

### Phase 1: Create Edge Function Error Parser Utility

Create a reusable utility that extracts meaningful error messages from Supabase edge function errors.

**New File: `src/lib/errors/edgeFunctionErrors.ts`**

This utility will:
- Check if the error is a `FunctionsHttpError` (has a `context` property that is a Response)
- Clone and parse the response body to extract the `error` field
- Return a user-friendly message, with fallbacks
- Map common error codes to user-friendly messages

### Phase 2: Update ProposalAcceptance Error Handling

Update the catch block in `src/pages/ProposalAcceptance/index.tsx` to use the new utility.

**Changes:**
- Import the new error parser utility
- Replace the simple `err.message` access with proper parsing
- Display the actual error message from the edge function

### Phase 3: Ensure Consistent Error Messages in Edge Function

Review and enhance the `accept-proposal` edge function to ensure all error paths return clear, user-friendly messages.

**Current Error Messages (already good):**
| Error Scenario | Current Message | User-Friendly? |
|---------------|-----------------|----------------|
| Token expired | "Invitation link has expired" | Yes |
| Already signed | "This proposal has already been signed" | Yes |
| Rejected | "This proposal has been rejected and cannot be signed" | Yes |
| No auth | "Authentication required" | Yes |
| Invalid name | "Please provide a valid name (minimum 2 characters)..." | Yes |
| DB exception | "Invalid or expired invitation token" | Yes |

**Improvement:** Add a specific error code field for frontend to potentially handle differently (optional enhancement).

## File Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `src/lib/errors/edgeFunctionErrors.ts` | Create | New utility to parse edge function errors |
| `src/pages/ProposalAcceptance/index.tsx` | Modify | Use new error parser in catch block |

## Technical Details

### New Utility Code Structure

```typescript
// src/lib/errors/edgeFunctionErrors.ts

export interface EdgeFunctionErrorResponse {
  error: string;
  code?: string;
  details?: string;
  alreadySigned?: boolean;
}

/**
 * Extracts user-friendly error message from Supabase edge function errors.
 * Handles the FunctionsHttpError which stores the response in .context
 */
export async function parseEdgeFunctionError(
  error: unknown,
  fallbackMessage: string = "An error occurred. Please try again."
): Promise<string> {
  // Check if it's a FunctionsHttpError (has context that is a Response)
  if (
    error &&
    typeof error === 'object' &&
    'context' in error &&
    error.context instanceof Response
  ) {
    try {
      // Clone the response before reading (Response body can only be read once)
      const response = error.context.clone();
      const data: EdgeFunctionErrorResponse = await response.json();
      
      if (data.error) {
        return data.error;
      }
    } catch (parseError) {
      console.error("Failed to parse edge function error:", parseError);
    }
  }
  
  // Fallback to standard Error message
  if (error instanceof Error) {
    // Don't show the generic Supabase message
    if (error.message.includes("non-2xx status code")) {
      return fallbackMessage;
    }
    return error.message;
  }
  
  return fallbackMessage;
}
```

### Updated Error Handling in ProposalAcceptance

```typescript
import { parseEdgeFunctionError } from "@/lib/errors/edgeFunctionErrors";

// In handleSubmit catch block:
} catch (err) {
  console.error("Error submitting agreement:", err);
  
  const errorMessage = await parseEdgeFunctionError(
    err,
    "Failed to submit agreement. Please try again."
  );
  
  toast({
    description: errorMessage,
    variant: "destructive",
  });
} finally {
  setIsSubmitting(false);
}
```

## Expected User Experience After Fix

| Scenario | Before | After |
|----------|--------|-------|
| Expired token | "Edge Function returned a non-2xx status code" | "Invitation link has expired" |
| Already signed | Generic error | "This proposal has already been signed" |
| Rejected proposal | Generic error | "This proposal has been rejected and cannot be signed" |
| Database error | Generic error | "Invalid or expired invitation token" |
| Network failure | Generic error | "Failed to submit agreement. Please try again." |

## Future Enhancements (Optional)

1. **Add error codes** for programmatic handling (e.g., show "Request new link" button for expired tokens)
2. **Apply pattern globally** to all edge function calls across the app
3. **Create a hook** like `useEdgeFunctionCall` that wraps invoke with proper error parsing

## Addressing the Immediate Issue

For Anthony and Abendruhe: Once this error handling is in place, the error message will clearly say "Invitation link has expired" instead of the generic message. You would still need to resend the invitation or extend the token expiration to allow them to sign.
