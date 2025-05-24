
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface SetTokenResult {
  success: boolean;
  valid: boolean;
  proposalId?: string;
  clientEmail?: string;
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
      tokenLogger.info("Starting token persistence process", { 
        tokenPrefix: token.substring(0, 8),
        timestamp: new Date().toISOString(),
        tokenLength: token.length
      });
      
      console.log("🚀 Starting token persistence process...");
      console.log(`Token to persist: ${token.substring(0, 8)}... (length: ${token.length})`);
      
      // Test edge function connectivity first
      console.log("🔗 Testing edge function connectivity...");
      
      // Call the edge function to set the token in the session
      tokenLogger.info("Invoking set-invitation-token edge function", { 
        tokenPrefix: token.substring(0, 8),
        functionUrl: 'set-invitation-token'
      });
      
      const { data, error: functionError } = await supabase.functions.invoke(
        'set-invitation-token',
        { 
          body: { token },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log("📡 Edge function response received:", { 
        hasData: !!data, 
        hasError: !!functionError,
        errorDetails: functionError 
      });
      
      if (functionError) {
        console.error("❌ Edge function error:", functionError);
        tokenLogger.error("Error invoking set-invitation-token function", { 
          error: functionError,
          message: functionError.message,
          details: functionError.details,
          context: functionError.context
        });
        
        // Provide more specific error messages based on the error type
        let errorMessage = "Failed to process invitation token";
        
        if (functionError.message?.includes('Invalid or expired')) {
          errorMessage = "This invitation link is invalid or has expired";
        } else if (functionError.message?.includes('network') || functionError.message?.includes('fetch')) {
          errorMessage = "Network error. Please check your connection and try again";
        } else if (functionError.message?.includes('FunctionsRelayError')) {
          errorMessage = "Service temporarily unavailable. Please try again in a moment";
        } else if (functionError.message) {
          errorMessage = functionError.message;
        }
        
        setError(errorMessage);
        return {
          success: false,
          valid: false,
          error: errorMessage
        };
      }
      
      // Parse the response
      const result = data as SetTokenResult;
      console.log("✅ Parsed edge function result:", result);
      
      tokenLogger.info("Received response from set-invitation-token function", { 
        success: result.success,
        valid: result.valid,
        hasError: !!result.error,
        errorMessage: result.error,
        hasProposalId: !!result.proposalId,
        hasClientEmail: !!result.clientEmail,
        proposalIdPrefix: result.proposalId?.substring(0, 8)
      });
      
      if (!result.success) {
        const errorMessage = result.error || "Failed to set invitation token";
        console.error("❌ Token persistence failed:", errorMessage);
        tokenLogger.error("Token persistence failed", { error: errorMessage });
        setError(errorMessage);
        return result;
      }
      
      if (!result.valid) {
        const errorMessage = result.error || "Invalid invitation token";
        console.warn("⚠️ Token was persisted but is invalid:", errorMessage);
        tokenLogger.warn("Token was persisted but is invalid", { error: errorMessage });
        setError(errorMessage);
        return result;
      }
      
      console.log("🎉 Token successfully persisted and validated!");
      tokenLogger.info("Token successfully persisted and validated", { 
        valid: result.valid,
        hasProposalId: !!result.proposalId,
        hasClientEmail: !!result.clientEmail,
        proposalIdPrefix: result.proposalId?.substring(0, 8)
      });
      
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error setting invitation token";
      console.error("💥 Unexpected error persisting token:", error);
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
