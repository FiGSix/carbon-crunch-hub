
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
 * Hook to manage proposal invitation tokens with direct validation
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
   * Direct database token validation method
   */
  const validateTokenDirectly = useCallback(async (token: string): Promise<SetTokenResult> => {
    try {
      console.log("🔄 === USING DIRECT TOKEN VALIDATION ===");
      tokenLogger.info("Using direct token validation", { tokenPrefix: token.substring(0, 8) });
      
      // Use the new direct validation function
      const { data: validationData, error: validationError } = await supabase.rpc(
        'validate_token_direct',
        { token_param: token }
      );

      if (validationError) {
        console.error("❌ Direct validation failed:", validationError);
        tokenLogger.error("❌ Direct validation failed", { error: validationError });
        return {
          success: false,
          valid: false,
          error: `Token validation failed: ${validationError.message}`
        };
      }

      console.log("✅ Direct validation successful:", validationData);

      const result = validationData?.[0];
      if (!result || !result.is_valid) {
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
        proposalId: result.proposal_id,
        clientEmail: result.client_email
      };

    } catch (error) {
      console.error("💥 Direct token validation failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Token validation failed";
      return {
        success: false,
        valid: false,
        error: errorMessage
      };
    }
  }, [tokenLogger]);

  /**
   * Persist and validate an invitation token using direct validation
   */
  const persistToken = useCallback(async (token: string): Promise<SetTokenResult> => {
    setLoading(true);
    setError(null);
    
    try {
      tokenLogger.info("🚀 Starting token validation", { 
        tokenPrefix: token.substring(0, 8),
        timestamp: new Date().toISOString()
      });
      
      console.log("🚀 === STARTING TOKEN VALIDATION ===");
      console.log(`📋 Token: ${token.substring(0, 8)}... (length: ${token.length})`);
      
      // Try direct validation first
      console.log("🔍 Attempting direct token validation...");
      const directResult = await validateTokenDirectly(token);
      
      if (directResult.success) {
        console.log("✅ Direct validation successful:", directResult);
        tokenLogger.info("✅ Direct validation successful", { 
          success: directResult.success,
          valid: directResult.valid
        });
        
        return directResult;
      }
      
      // If direct validation fails, try edge function as fallback
      console.log("📡 Trying edge function fallback...");
      
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
          console.warn("⚠️ Edge function failed:", functionError);
          tokenLogger.warn("Edge function failed", { error: functionError });
          
          // Return the direct validation result even if edge function fails
          return directResult;
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
        console.warn("⚠️ Edge function exception:", edgeFunctionError);
        tokenLogger.warn("Edge function exception", { error: edgeFunctionError });
        
        // Return the direct validation result
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
  }, [tokenLogger, validateTokenDirectly, user?.email]);

  return {
    persistToken,
    testConnectivity,
    loading,
    error
  };
}
