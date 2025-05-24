
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { SetTokenResult } from "./types";

const tokenLogger = logger.withContext({
  component: 'edgeFunctionService',
  feature: 'proposals'
});

/**
 * Test edge function connectivity with deployment verification
 */
export async function testConnectivity(): Promise<boolean> {
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
}

/**
 * Call edge function as fallback for token validation
 */
export async function validateTokenViaEdgeFunction(
  token: string, 
  userEmail?: string
): Promise<SetTokenResult> {
  console.log("📡 Trying edge function fallback...");
  
  const requestBody = { 
    token, 
    email: userEmail || undefined 
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
      throw functionError;
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
    throw edgeFunctionError;
  }
}
