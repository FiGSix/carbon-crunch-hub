
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ClientInformation, ProjectInformation } from "../types";

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
      
      console.log("🚀 Starting invitation process for proposal:", id);
      
      // First verify the proposal is in the correct status
      const { data: proposalData, error: proposalError } = await supabase
        .from('proposals')
        .select('status, content, client_id, invitation_token')
        .eq('id', id)
        .single();
      
      if (proposalError) {
        console.error("❌ Error fetching proposal data:", proposalError);
        return { success: false, error: proposalError.message };
      }
      
      // Verify proposal is in the pending status
      if (proposalData.status !== 'pending') {
        const errorMsg = `Proposal must be in 'pending' status to send invitations. Current status: ${proposalData.status}`;
        console.error("❌", errorMsg);
        return { success: false, error: errorMsg };
      }
      
      // Check if proposal already has a token
      let tokenToUse = proposalData.invitation_token;
      
      if (!tokenToUse) {
        console.log("📝 No existing token found, generating new one...");
        
        // Generate token and set expiration date (48 hours from now)
        const expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + 48);
        
        const { data: token, error: tokenError } = await supabase.rpc('generate_secure_token');
        
        if (tokenError) {
          console.error("❌ Token generation error:", tokenError);
          return { success: false, error: tokenError.message };
        }
        
        console.log("✅ Token generated successfully:", token.substring(0, 8) + "...");
        
        // Update the proposal with invitation details
        const { error: updateError } = await supabase
          .from('proposals')
          .update({
            invitation_token: token,
            invitation_sent_at: new Date().toISOString(),
            invitation_expires_at: expirationDate.toISOString(),
            invitation_viewed_at: null
          })
          .eq('id', id);
        
        if (updateError) {
          console.error("❌ Error updating proposal with invitation details:", updateError);
          return { success: false, error: updateError.message };
        }
        
        tokenToUse = token;
        console.log("✅ Proposal updated with new invitation details");
      } else {
        console.log("📋 Using existing token:", tokenToUse.substring(0, 8) + "...");
        
        // Update sent timestamp
        const { error: updateError } = await supabase
          .from('proposals')
          .update({
            invitation_sent_at: new Date().toISOString(),
            invitation_viewed_at: null
          })
          .eq('id', id);
        
        if (updateError) {
          console.error("❌ Error updating invitation sent timestamp:", updateError);
          return { success: false, error: updateError.message };
        }
      }
      
      // Extract client info from proposal content
      const content = proposalData.content as ProposalContent;
      const clientInfo = content?.clientInfo;
      const clientId = proposalData.client_id;
      
      console.log("📋 Proposal data retrieved:", { 
        clientInfo: clientInfo?.email ? "✅" : "❌", 
        clientId: clientId ? "✅" : "❌",
        hasClientEmail: !!clientInfo?.email,
        tokenLength: tokenToUse.length
      });
      
      if (!clientInfo?.email) {
        return { success: false, error: "No client email found in the proposal" };
      }
      
      console.log("📧 Calling email function with token:", tokenToUse.substring(0, 8) + "...");
      
      // Call the edge function to send email
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
      
      // Parse the response
      const emailResponse = response.data as InvitationResponse;
      console.log("📧 Email function response:", {
        success: emailResponse?.success,
        hasError: !!emailResponse?.error,
        debug: emailResponse?.debug
      });
      
      if (!emailResponse?.success) {
        const errorMessage = emailResponse?.details || emailResponse?.error || "Email service error";
        console.error("❌ Email sending failed:", errorMessage);
        
        // If email sending fails, we should revert the invitation token update if we just created it
        if (!proposalData.invitation_token) {
          await supabase
            .from('proposals')
            .update({
              invitation_token: null,
              invitation_sent_at: null,
              invitation_expires_at: null
            })
            .eq('id', id);
        }
          
        return { success: false, error: errorMessage };
      }
      
      console.log("✅ Invitation sent successfully!");
      console.log("🔗 Debug info:", emailResponse.debug);
      
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
      console.error("❌ Error sending invitation:", error);
      
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
