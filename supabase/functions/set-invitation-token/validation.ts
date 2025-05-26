
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

export async function validateTokenDirect(
  token: string,
  supabase: ReturnType<typeof createClient>
): Promise<{
  is_valid: boolean;
  proposal_id?: string;
  client_email?: string;
  client_id?: string;
  client_reference_id?: string;
}> {
  try {
    console.log(`Validating token directly: ${token.substring(0, 8)}...`);
    
    const { data, error } = await supabase.rpc('validate_token_direct', {
      token_param: token
    });

    if (error) {
      console.error("Direct token validation error:", error);
      return { is_valid: false };
    }

    const result = data?.[0];
    if (!result) {
      console.log("No result from token validation");
      return { is_valid: false };
    }

    console.log("Token validation result:", {
      is_valid: result.is_valid,
      proposal_id: result.proposal_id,
      has_client_email: !!result.client_email
    });

    return {
      is_valid: result.is_valid || false,
      proposal_id: result.proposal_id,
      client_email: result.client_email,
      client_id: result.client_id,
      client_reference_id: result.client_reference_id
    };
  } catch (error) {
    console.error("Exception during token validation:", error);
    return { is_valid: false };
  }
}

export async function markInvitationAsViewed(
  token: string,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  try {
    console.log(`Marking invitation as viewed for token: ${token.substring(0, 8)}...`);
    
    const { error } = await supabase.rpc('mark_invitation_viewed', {
      token_param: token
    });

    if (error) {
      console.error("Error marking invitation as viewed:", error);
    } else {
      console.log("Successfully marked invitation as viewed");
    }
  } catch (error) {
    console.error("Exception marking invitation as viewed:", error);
  }
}
