
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
   * Test edge function connectivity
   */
  const testConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      tokenLogger.info("🩺 Testing edge function connectivity");
      console.log("🩺 Testing edge function connectivity...");
      
      const { data, error: healthError } = await supabase.functions.invoke('health-check');
      
      if (healthError) {
        console.error("❌ Health check failed:", healthError);
        tokenLogger.error("❌ Health check failed", { error: healthError });
        return false;
      }
      
      console.log("✅ Health check passed:", data);
      tokenLogger.info("✅ Health check passed", { data });
      return true;
    } catch (error) {
      console.error("💥 Health check exception:", error);
      tokenLogger.error("💥 Health check exception", { error });
      return false;
    }
  }, [tokenLogger]);

  /**
   * Persist and validate an invitation token
   */
  const persistToken = useCallback(async (token: string): Promise<SetTokenResult> => {
    setLoading(true);
    setError(null);
    
    try {
      tokenLogger.info("🚀 Starting token persistence process", { 
        tokenPrefix: token.substring(0, 8),
        timestamp: new Date().toISOString(),
        tokenLength: token.length
      });
      
      console.log("🚀 === STARTING TOKEN PERSISTENCE PROCESS ===");
      console.log(`📋 Token to persist: ${token.substring(0, 8)}... (length: ${token.length})`);
      console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
      
      // Test edge function connectivity first
      console.log("🩺 Testing edge function connectivity...");
      const isHealthy = await testConnectivity();
      
      if (!isHealthy) {
        const errorMessage = "Edge function connectivity test failed. The function may not be properly deployed.";
        console.error("❌ === CONNECTIVITY TEST FAILED ===");
        tokenLogger.error("❌ Connectivity test failed");
        setError(errorMessage);
        return {
          success: false,
          valid: false,
          error: errorMessage
        };
      }
      
      console.log("✅ Edge function connectivity confirmed");
      
      // Call the edge function to set the token in the session
      tokenLogger.info("📡 Invoking set-invitation-token edge function", { 
        tokenPrefix: token.substring(0, 8),
        functionUrl: 'set-invitation-token'
      });
      
      console.log("📡 Calling set-invitation-token edge function...");
      console.log(`📋 Function payload: { token: "${token.substring(0, 8)}..." }`);
      
      const { data, error: functionError } = await supabase.functions.invoke(
        'set-invitation-token',
        { 
          body: { token },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log("📡 === EDGE FUNCTION RESPONSE ===", { 
        hasData: !!data, 
        hasError: !!functionError,
        dataContent: data,
        errorDetails: functionError 
      });
      
      if (functionError) {
        console.error("❌ === EDGE FUNCTION ERROR ===", functionError);
        tokenLogger.error("❌ Error invoking set-invitation-token function", { 
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
        } else if (functionError.message?.includes('FunctionsHttpError')) {
          errorMessage = "Edge function error. Please contact support if this persists";
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
      console.log("✅ === PARSED EDGE FUNCTION RESULT ===", result);
      
      tokenLogger.info("✅ Received response from set-invitation-token function", { 
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
        console.error("❌ === TOKEN PERSISTENCE FAILED ===", errorMessage);
        tokenLogger.error("❌ Token persistence failed", { error: errorMessage });
        setError(errorMessage);
        return result;
      }
      
      if (!result.valid) {
        const errorMessage = result.error || "Invalid invitation token";
        console.warn("⚠️ === TOKEN INVALID ===", errorMessage);
        tokenLogger.warn("⚠️ Token was persisted but is invalid", { error: errorMessage });
        setError(errorMessage);
        return result;
      }
      
      console.log("🎉 === TOKEN SUCCESSFULLY VALIDATED ===");
      tokenLogger.info("🎉 Token successfully persisted and validated", { 
        valid: result.valid,
        hasProposalId: !!result.proposalId,
        hasClientEmail: !!result.clientEmail,
        proposalIdPrefix: result.proposalId?.substring(0, 8)
      });
      
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error setting invitation token";
      console.error("💥 === UNEXPECTED ERROR ===", error);
      tokenLogger.error("💥 Unexpected error persisting token", { 
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
  }, [tokenLogger, testConnectivity]);

  return {
    persistToken,
    testConnectivity,
    loading,
    error
  };
}
