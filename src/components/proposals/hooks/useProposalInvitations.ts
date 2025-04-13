
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
      
      // Generate token and set expiration date (48 hours from now)
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 48);
      
      const { data: token, error: tokenError } = await supabase.rpc('generate_secure_token');
      
      if (tokenError) throw tokenError;
      
      // Update the proposal with invitation details
      const { data: proposalData, error: proposalError } = await supabase
        .from('proposals')
        .select('content, client_id')
        .eq('id', id)
        .single();
      
      if (proposalError) throw proposalError;
      
      // Extract client info from proposal content
      const content = proposalData.content as ProposalContent;
      const clientInfo = content?.clientInfo;
      const clientId = proposalData.client_id;
      
      if (!clientInfo?.email) {
        throw new Error("No client email found in the proposal");
      }
      
      // Call the edge function to send email
      const response = await supabase.functions.invoke('send-proposal-invitation', {
        body: JSON.stringify({
          proposalId: id,
          clientEmail: clientInfo.email,
          clientName: clientInfo.name || 'Client',
          invitationToken: token,
          projectName: content?.projectInfo?.name || 'Carbon Credit Project',
          clientId: clientId
        })
      });
      
      // Parse the response
      const emailResponse = response.data as InvitationResponse;
      
      if (!emailResponse.success) {
        const errorMessage = emailResponse.details || emailResponse.error || "Email service error";
        throw new Error(errorMessage);
      }
      
      // Update the proposal with invitation details
      const { error } = await supabase
        .from('proposals')
        .update({
          invitation_token: token,
          invitation_sent_at: new Date().toISOString(),
          invitation_expires_at: expirationDate.toISOString(),
          invitation_viewed_at: null
        })
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      // Set the last sent proposal ID for testing reference
      setLastSentProposalId(id);
      
      toast({
        title: "Invitation Sent",
        description: "An email invitation has been sent to the client.",
      });
      
      // Refresh the proposal list
      if (onProposalUpdate) {
        onProposalUpdate();
      }
      
      return { success: true, proposalId: id, token };
    } catch (error) {
      console.error("Error sending invitation:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Failed to send invitation";
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
      
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
