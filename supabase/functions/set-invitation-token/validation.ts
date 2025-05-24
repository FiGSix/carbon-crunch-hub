
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";
import { ValidationResult } from "./types.ts";

export async function validateTokenDirect(
  token: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<ValidationResult> {
  console.log(`🔍 Validating token directly...`);
  
  const { data: validationData, error: validationError } = await supabaseClient.rpc(
    'validate_token_direct',
    { token_param: token }
  );

  if (validationError) {
    console.error(`❌ Validation error:`, validationError);
    throw new Error(`Token validation failed: ${validationError.message}`);
  }

  console.log(`📊 Validation result:`, validationData);

  const result = validationData?.[0];
  return {
    proposal_id: result?.proposal_id,
    client_email: result?.client_email,
    is_valid: result?.is_valid || false
  };
}

export async function markInvitationAsViewed(
  token: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<void> {
  try {
    const { error } = await supabaseClient.rpc('mark_invitation_viewed', { token_param: token });
    if (error) {
      console.error(`⚠️ Failed to mark as viewed:`, error);
    } else {
      console.log(`✅ Marked invitation as viewed`);
    }
  } catch (error) {
    console.error(`⚠️ Exception marking as viewed:`, error);
  }
}
