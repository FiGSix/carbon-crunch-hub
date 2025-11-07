
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ClientInformation, ProjectInformation } from "../types";
import { logger } from '@/lib/logger';

interface ProposalContent {
  clientInfo?: ClientInformation;
  projectInfo?: ProjectInformation;
}

interface InvitationResponse {
  success: boolean;
  error?: string;
  details?: string;
  data?: any;
  debug?: {
    tokenUsed?: string;
    proposalId?: string;
    invitationLink?: string;
  };
}

export function useProposalInvitations(onProposalUpdate?: () => void) {
  const { toast } = useToast();
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSentProposalId, setLastSentProposalId] = useState<string | null>(null);
  
  const handleSendInvitation = async (id: string) => {
    try {
      setSending(true);
      setError(null);
      
      logger.info("Starting invitation process for proposal", { proposalId: id });
      
      // First verify the proposal is in the correct status
      const { data: proposalData, error: proposalError } = await supabase
        .from('proposals')
        .select('status, content, client_id, invitation_token')
        .eq('id', id)
        .single();
      
      if (proposalError) {
        logger.error("Error fetching proposal data", { error: proposalError });
        return { success: false, error: proposalError.message };
      }
      
      // Verify proposal is in the pending status
      if (proposalData.status !== 'pending') {
        const errorMsg = `Proposal must be in 'pending' status to send invitations. Current status: ${proposalData.status}`;
        logger.error(errorMsg);
        return { success: false, error: errorMsg };
      }
      
      // Check if proposal already has a token
      let tokenToUse = proposalData.invitation_token;
      let expirationDate: Date;
      
      if (!tokenToUse) {
        logger.debug("No existing token found, generating new one");
        
        // Generate token and set expiration date (10 days from now)
        expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + 240);
        
        const { data: token, error: tokenError } = await supabase.rpc('generate_secure_token');
        
        if (tokenError) {
          logger.error("Token generation error", { error: tokenError });
          return { success: false, error: tokenError.message };
        }
        
        logger.debug("Token generated successfully", { tokenPrefix: token.substring(0, 8) });
        
        // Update the proposal with token and expiration (but NOT invitation_sent_at yet)
        const { error: updateError } = await supabase
          .from('proposals')
          .update({
            invitation_token: token,
            invitation_expires_at: expirationDate.toISOString(),
            invitation_viewed_at: null
          })
          .eq('id', id);
        
        if (updateError) {
          logger.error("Error updating proposal with token", { error: updateError });
          return { success: false, error: updateError.message };
        }
        
        tokenToUse = token;
        logger.debug("Proposal updated with new token (email not sent yet)");
      } else {
        logger.debug("Using existing token", { tokenPrefix: tokenToUse.substring(0, 8) });
      }
      
      // Extract client info from proposal content
      const content = proposalData.content as ProposalContent;
      const clientInfo = content?.clientInfo;
      const clientId = proposalData.client_id;
      
      logger.debug("Proposal data retrieved", { 
        hasClientInfo: !!clientInfo?.email,
        hasClientId: !!clientId,
        hasClientEmail: !!clientInfo?.email,
        tokenLength: tokenToUse.length
      });
      
      if (!clientInfo?.email) {
        return { success: false, error: "No client email found in the proposal" };
      }
      
      logger.info("Calling email function", { tokenPrefix: tokenToUse.substring(0, 8) });
      
      // Call the edge function to send email with timeout handling
      const invokeStartTime = Date.now();
      const response = await supabase.functions.invoke('send-proposal-invitation', {
        body: JSON.stringify({
          proposalId: id,
          clientEmail: clientInfo.email,
          clientName: clientInfo.name || 'Client',
          invitationToken: tokenToUse,
          projectName: content?.projectInfo?.name || 'Carbon Credit Project',
          clientId: clientId
        })
      });
      const invokeDuration = Date.now() - invokeStartTime;
      
      logger.info("Edge function responded", { duration: invokeDuration });
      
      // Check for network/invocation errors first
      if (response.error) {
        const errorDetails = {
          message: response.error.message,
          status: (response.error as any).status,
          code: (response.error as any).code
        };
        
        logger.error("Edge function invocation failed", {
          error: errorDetails,
          duration: invokeDuration
        });

        // Check for authentication errors specifically
        if (errorDetails.status === 401 || errorDetails.code === 'AUTH_REQUIRED' || errorDetails.code === 'AUTH_EXPIRED') {
          return { 
            success: false, 
            error: 'Your session has expired. Please refresh the page and try again.'
          };
        }
        
        // Revert token if we just created it
        if (!proposalData.invitation_token) {
          await supabase
            .from('proposals')
            .update({
              invitation_token: null,
              invitation_expires_at: null
            })
            .eq('id', id);
        }
        
        return { 
          success: false, 
          error: `Network error: ${response.error.message || 'Edge function invocation failed'}`
        };
      }
      
      // Parse the response
      const emailResponse = response.data as InvitationResponse;
      logger.info("Email function response", {
        success: emailResponse?.success,
        hasError: !!emailResponse?.error,
        debug: emailResponse?.debug,
        duration: invokeDuration
      });
      
      if (!emailResponse?.success) {
        const errorMessage = emailResponse?.details || emailResponse?.error || "Email service error";
        logger.error("Email sending failed", {
          error: errorMessage,
          duration: invokeDuration
        });
        
        // Revert token if we just created it
        if (!proposalData.invitation_token) {
          await supabase
            .from('proposals')
            .update({
              invitation_token: null,
              invitation_expires_at: null
            })
            .eq('id', id);
        }
          
        return { success: false, error: errorMessage };
      }
      
      // ✅ EMAIL SENT SUCCESSFULLY - NOW update invitation_sent_at
      logger.info("Email confirmed sent, updating database");
      const { error: sentUpdateError } = await supabase
        .from('proposals')
        .update({
          invitation_sent_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (sentUpdateError) {
        logger.warn("Email sent but failed to update sent timestamp", { error: sentUpdateError });
        // Don't fail the whole operation since email was actually sent
      }
      
      logger.info("Invitation sent successfully", { debug: emailResponse.debug });
      
      // Set the last sent proposal ID for testing reference
      setLastSentProposalId(id);
      
      // Refresh the proposal list
      if (onProposalUpdate) {
        onProposalUpdate();
      }
      
      return { 
        success: true, 
        proposalId: id, 
        token: tokenToUse,
        debug: emailResponse.debug
      };
    } catch (error: any) {
      logger.error("Error sending invitation", { error });
      
      const errorMessage = error instanceof Error ? error.message : "Failed to send invitation";
      setError(errorMessage);
      
      return { success: false, error: errorMessage };
    } finally {
      setSending(false);
    }
  };
  
  const handleResendInvitation = async (id: string) => {
    return await handleSendInvitation(id);
  };
  
  return {
    handleSendInvitation,
    handleResendInvitation,
    sending,
    error,
    lastSentProposalId
  };
}
