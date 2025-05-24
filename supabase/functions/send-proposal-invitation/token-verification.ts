
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

export async function verifyTokenConsistency(
  proposalId: string,
  requestToken: string,
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  console.log(`Verifying token consistency for proposal ${proposalId}`);
  console.log(`Token from request: ${requestToken.substring(0, 8)}...`);
  
  const { data: proposalData, error: proposalError } = await supabase
    .from('proposals')
    .select('invitation_token, status, title')
    .eq('id', proposalId)
    .single();
  
  if (proposalError) {
    console.error("Error fetching proposal for token verification:", proposalError);
    throw new Error(`Failed to verify proposal: ${proposalError.message}`);
  }
  
  if (!proposalData.invitation_token) {
    console.error("No invitation token found in database for proposal:", proposalId);
    throw new Error("No invitation token found for this proposal");
  }
  
  console.log(`Token from database: ${proposalData.invitation_token.substring(0, 8)}...`);
  
  // Verify tokens match
  if (proposalData.invitation_token !== requestToken) {
    console.error("TOKEN MISMATCH DETECTED!");
    console.error(`Request token: ${requestToken}`);
    console.error(`Database token: ${proposalData.invitation_token}`);
    throw new Error("Token mismatch between request and database. This indicates a data consistency issue.");
  }
  
  console.log("✅ Token verification successful - tokens match");
  return proposalData.invitation_token;
}
