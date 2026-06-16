/**
 * Edge Function Error Parser
 * 
 * Extracts meaningful error messages from Supabase edge function errors.
 * The Supabase client wraps non-2xx responses in FunctionsHttpError where
 * the actual error details are in error.context (a Response object).
 */

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
