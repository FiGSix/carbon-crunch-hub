
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface SetTokenResult {
  success: boolean;
  tokenSet: boolean;
  valid: boolean;
  proposalId?: string;
  error?: string;
}

/**
 * Hook to manage proposal invitation tokens
 */
export function useInvitationToken() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Create a contextualized logger
  const tokenLogger = logger.withContext({
    component: 'useInvitationToken',
    feature: 'proposals'
  });

  /**
   * Persist an invitation token to the session via the edge function
   */
  const persistToken = useCallback(async (token: string): Promise<SetTokenResult> => {
    setLoading(true);
    setError(null);
    
    try {
      tokenLogger.info("Persisting invitation token", { tokenPrefix: token.substring(0, 8) });
      
      // Call the edge function to set the token in the session
      const { data, error: functionError } = await supabase.functions.invoke(
        'set-invitation-token',
        { 
          body: JSON.stringify({ token }) 
        }
      );
      
      if (functionError) {
        tokenLogger.error("Error invoking set-invitation-token function", { error: functionError });
        setError(functionError.message);
        return {
          success: false,
          tokenSet: false,
          valid: false,
          error: functionError.message
        };
      }
      
      // Parse the response
      const result = data as SetTokenResult;
      
      if (!result.success) {
        tokenLogger.error("Token persistence failed", { error: result.error });
        setError(result.error || "Failed to set invitation token");
        return result;
      }
      
      if (!result.valid) {
        tokenLogger.warn("Token was persisted but is invalid", { error: result.error });
        setError(result.error || "Invalid invitation token");
        return result;
      }
      
      tokenLogger.info("Token successfully persisted", { 
        tokenSet: result.tokenSet,
        valid: result.valid,
        hasProposalId: !!result.proposalId
      });
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error setting invitation token";
      tokenLogger.error("Unexpected error persisting token", { error });
      setError(errorMessage);
      
      return {
        success: false,
        tokenSet: false,
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
