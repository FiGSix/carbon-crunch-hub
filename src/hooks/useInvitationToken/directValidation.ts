
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { SetTokenResult } from "./types";

const tokenLogger = logger.withContext({
  component: 'directValidation',
  feature: 'proposals'
});

/**
 * Direct database token validation method
 */
export async function validateTokenDirectly(token: string): Promise<SetTokenResult> {
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
}
