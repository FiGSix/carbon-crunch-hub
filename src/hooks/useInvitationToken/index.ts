
import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth";
import { SetTokenResult } from "./types";
import { validateTokenDirectly } from "./directValidation";
import { createTokenLogger } from "./utils";

/**
 * Hook to manage proposal invitation tokens with direct database validation
 */
export function useInvitationToken() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  
  const tokenLogger = createTokenLogger();

  /**
   * Persist and validate an invitation token using direct database validation
   */
  const persistToken = useCallback(async (token: string): Promise<SetTokenResult> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("🔍 === STARTING DIRECT TOKEN VALIDATION ===");
      console.log(`🎫 Token: ${token.substring(0, 8)}...`);
      
      // Use direct database validation (bypassing edge function)
      const directResult = await validateTokenDirectly(token);
      
      if (directResult.success) {
        console.log("✅ Direct validation completed:", { valid: directResult.valid });
        return directResult;
      }
      
      // If direct validation fails completely, return the error
      return directResult;
      
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
  }, [tokenLogger]);

  return {
    persistToken,
    loading,
    error
  };
}

export type { SetTokenResult };
