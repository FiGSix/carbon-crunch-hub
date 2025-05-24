
import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth";
import { SetTokenResult } from "./types";
import { validateTokenDirectly } from "./directValidation";
import { testConnectivity, validateTokenViaEdgeFunction } from "./edgeFunctionService";
import { logTokenValidationStart, logTokenValidationComplete, createTokenLogger } from "./utils";

/**
 * Hook to manage proposal invitation tokens with direct validation
 */
export function useInvitationToken() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  
  const tokenLogger = createTokenLogger();

  /**
   * Persist and validate an invitation token using direct validation
   */
  const persistToken = useCallback(async (token: string): Promise<SetTokenResult> => {
    setLoading(true);
    setError(null);
    
    try {
      logTokenValidationStart(token);
      
      // Try direct validation first
      console.log("🔍 Attempting direct token validation...");
      const directResult = await validateTokenDirectly(token);
      
      if (directResult.success) {
        logTokenValidationComplete(directResult.success, directResult.valid);
        return directResult;
      }
      
      // If direct validation fails, try edge function as fallback
      try {
        const edgeFunctionResult = await validateTokenViaEdgeFunction(token, user?.email);
        logTokenValidationComplete(true, edgeFunctionResult.valid);
        return edgeFunctionResult;
        
      } catch (edgeFunctionError) {
        // Return the direct validation result if edge function fails
        return directResult;
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error validating invitation token";
      console.error("💥 Complete token validation failed:", error);
      tokenLogger.error("💥 Complete token validation failed", { error });
      
      setError(errorMessage);
      
      return {
        success: false,
        valid: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [tokenLogger, user?.email]);

  return {
    persistToken,
    testConnectivity,
    loading,
    error
  };
}

export type { SetTokenResult };
