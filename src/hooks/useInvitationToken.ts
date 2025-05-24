
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";
import { logger } from "@/lib/logger";

interface SetTokenResult {
  success: boolean;
  valid: boolean;
  proposalId?: string;
  clientEmail?: string;
  error?: string;
  version?: string;
  deploymentTime?: string;
}

/**
 * Hook to manage proposal invitation tokens with fallback support
 */
export function useInvitationToken() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  
  const tokenLogger = logger.withContext({
    component: 'useInvitationToken',
    feature: 'proposals'
  });

  /**
   * Test edge function connectivity with deployment verification
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
   * Direct database fallback method
   */
  const persistTokenDirectly = useCallback(async (token: string): Promise<SetTokenResult> => {
    try {
      console.log("🔄 === USING DIRECT DATABASE FALLBACK ===");
      tokenLogger.info("Using direct database fallback for token", { tokenPrefix: token.substring(0, 8) });
      
      // Step 1: Set token in session
      const { data: tokenSetResult, error: tokenError } = await supabase.rpc(
        'set_request_invitation_token',
        { token }
      );

      if (tokenError) {
        console.error("❌ Direct token set failed:", tokenError);
        throw new Error(`Failed to set token: ${tokenError.message}`);
      }

      console.log("✅ Direct token set successful:", tokenSetResult);

      // Step 2: Validate token
      const { data: validationData, error: validationError } = await supabase.rpc(
        'validate_invitation_token',
        { token }
      );

      if (validationError) {
        console.error("❌ Direct validation failed:", validationError);
        return {
          success: true,
          valid: false,
          error: 'Invalid or expired invitation token'
        };
      }

      console.log("✅ Direct validation successful:", validationData);

      const proposalId = validationData?.[0]?.proposal_id;
      const clientEmail = validationData?.[0]?.client_email;
      const valid = !!proposalId;

      if (!valid) {
        return {
          success: true,
          valid: false,
          error: 'This invitation link is invalid or has expired'
        };
      }

      // Mark as viewed (non-blocking)
      supabase.rpc('mark_invitation_viewed', { token_param: token })
        .then(({ error }) => {
          if (error) {
            console.error("⚠️ Failed to mark as viewed:", error);
          } else {
            console.log("✅ Marked invitation as viewed");
          }
        });

      return {
        success: true,
        valid: true,
        proposalId,
        clientEmail
      };

    } catch (error) {
      console.error("💥 Direct database fallback failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Database fallback failed";
      return {
        success: false,
        valid: false,
        error: errorMessage
      };
    }
  }, [tokenLogger]);

  /**
   * Persist and validate an invitation token with automatic fallback
   */
  const persistToken = useCallback(async (token: string): Promise<SetTokenResult> => {
    setLoading(true);
    setError(null);
    
    try {
      tokenLogger.info("🚀 Starting token persistence", { 
        tokenPrefix: token.substring(0, 8),
        timestamp: new Date().toISOString()
      });
      
      console.log("🚀 === STARTING TOKEN PERSISTENCE ===");
      console.log(`📋 Token: ${token.substring(0, 8)}... (length: ${token.length})`);
      
      // First attempt: Edge function
      console.log("📡 Attempting edge function call...");

      // Prepare the request body - ensure it's valid JSON
      const requestBody = { 
        token, 
        email: user?.email || undefined 
      };
      
      console.log("📨 Edge function input:", requestBody);
      
      try {
        const { data, error: functionError } = await supabase.functions.invoke(
          'set-invitation-token',
          {
            body: requestBody,
            headers: { 
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (functionError) {
          console.warn("⚠️ Edge function failed, using fallback:", functionError);
          tokenLogger.warn("Edge function failed, using database fallback", { error: functionError });
          
          // Fallback to direct database method
          return await persistTokenDirectly(token);
        }
        
        const result = data as SetTokenResult;
        console.log("✅ Edge function successful:", result);
        
        tokenLogger.info("✅ Edge function successful", { 
          success: result.success,
          valid: result.valid,
          version: result.version,
          deploymentTime: result.deploymentTime
        });
        
        return result;
        
      } catch (edgeFunctionError) {
        console.warn("⚠️ Edge function exception, using fallback:", edgeFunctionError);
        tokenLogger.warn("Edge function exception, using database fallback", { error: edgeFunctionError });
        
        // Fallback to direct database method
        return await persistTokenDirectly(token);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error setting invitation token";
      console.error("💥 Complete token persistence failed:", error);
      tokenLogger.error("💥 Complete token persistence failed", { error });
      
      setError(errorMessage);
      
      return {
        success: false,
        valid: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [tokenLogger, persistTokenDirectly, user?.email]);

  return {
    persistToken,
    testConnectivity,
    loading,
    error
  };
}
