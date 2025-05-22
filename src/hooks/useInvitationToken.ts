
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface SetTokenResult {
  success: boolean;
  valid: boolean;
  proposalId?: string;
  clientEmail?: string; // Added clientEmail property to interface
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
   * Persist and validate an invitation token
   */
  const persistToken = useCallback(async (token: string): Promise<SetTokenResult> => {
    setLoading(true);
    setError(null);
    
    try {
      tokenLogger.info("Setting and validating invitation token", { 
        tokenPrefix: token.substring(0, 8),
        timestamp: new Date().toISOString()
      });
      
      // Call the edge function to set the token in the session
      tokenLogger.info("Invoking set-invitation-token edge function", { token: token.substring(0, 8) });
      
      const { data, error: functionError } = await supabase.functions.invoke(
        'set-invitation-token',
        { 
          body: JSON.stringify({ token }) 
        }
      );
      
      if (functionError) {
        tokenLogger.error("Error invoking set-invitation-token function", { 
          error: functionError,
          message: functionError.message,
          status: functionError.status,
          name: functionError.name
        });
        
        setError(functionError.message);
        return {
          success: false,
          valid: false,
          error: functionError.message
        };
      }
      
      // Parse the response
      const result = data as SetTokenResult;
      tokenLogger.info("Received response from set-invitation-token function", { 
        success: result.success,
        valid: result.valid,
        hasError: !!result.error,
        errorMessage: result.error
      });
      
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
      
      tokenLogger.info("Token successfully persisted and validated", { 
        valid: result.valid,
        hasProposalId: !!result.proposalId,
        hasClientEmail: !!result.clientEmail,
        proposalId: result.proposalId?.substring(0, 8)
      });
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error setting invitation token";
      tokenLogger.error("Unexpected error persisting token", { 
        error,
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      
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
