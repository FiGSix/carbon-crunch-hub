
/**
 * Test utilities for validating email functionality
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Checks if a proposal invitation was sent successfully
 * @param proposalId The ID of the proposal
 * @returns Object containing the success status and error message if any
 */
export async function verifyInvitationSent(proposalId: string): Promise<{success: boolean, error?: string}> {
  try {
    // Check if the proposal has invitation data
    const { data, error } = await supabase
      .from('proposals')
      .select('invitation_sent_at, invitation_token, invitation_expires_at')
      .eq('id', proposalId)
      .single();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    if (!data.invitation_sent_at || !data.invitation_token || !data.invitation_expires_at) {
      return { success: false, error: 'Invitation data is incomplete' };
    }
    
    // Verify expiration date is properly set (48 hours in the future)
    const expirationDate = new Date(data.invitation_expires_at);
    const now = new Date();
    const hoursUntilExpiration = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilExpiration < 47 || hoursUntilExpiration > 49) {
      return { 
        success: false, 
        error: `Expiration time is incorrect: ${hoursUntilExpiration.toFixed(1)} hours (should be ~48)` 
      };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Tests if an invitation token is valid
 * @param token The invitation token to test
 * @returns Object containing validity status and proposal ID if valid
 */
export async function testInvitationToken(token: string): Promise<{valid: boolean, proposalId?: string}> {
  try {
    const { data: proposalId, error } = await supabase.rpc('validate_invitation_token', { token });
    
    if (error || !proposalId) {
      return { valid: false };
    }
    
    return { valid: true, proposalId };
  } catch (error) {
    console.error("Error testing invitation token:", error);
    return { valid: false };
  }
}

/**
 * Checks if a token link is valid and accessible
 * @param token The invitation token
 * @returns Promise resolving to an object with test results
 */
export async function testTokenLinkAccess(token: string): Promise<{
  accessible: boolean;
  proposalExists: boolean;
  error?: string;
}> {
  try {
    // First validate the token
    const { valid, proposalId } = await testInvitationToken(token);
    
    if (!valid || !proposalId) {
      return { accessible: false, proposalExists: false, error: 'Invalid token' };
    }
    
    // Now check if we can access the proposal
    const { data, error } = await supabase
      .from('proposals')
      .select('id, title, content')
      .eq('id', proposalId)
      .single();
    
    if (error) {
      return { 
        accessible: false, 
        proposalExists: false, 
        error: `Cannot access proposal: ${error.message}` 
      };
    }
    
    return { accessible: true, proposalExists: true };
  } catch (error) {
    return { 
      accessible: false, 
      proposalExists: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
