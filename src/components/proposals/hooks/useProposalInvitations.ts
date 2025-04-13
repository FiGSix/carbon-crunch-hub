
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ClientInformation, ProjectInformation } from "../types";

interface ProposalContent {
  clientInfo?: ClientInformation;
  projectInfo?: ProjectInformation;
}

export function useProposalInvitations(onProposalUpdate?: () => void) {
  const { toast } = useToast();
  const [sending, setSending] = useState<boolean>(false);
  
  const handleSendInvitation = async (id: string) => {
    try {
      setSending(true);
      
      // Generate token and set expiration date (48 hours from now)
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 48);
      
      const { data: token, error: tokenError } = await supabase.rpc('generate_secure_token');
      
      if (tokenError) throw tokenError;
      
      // Update the proposal with invitation details
      const { data: proposalData, error: proposalError } = await supabase
        .from('proposals')
        .select('content')
        .eq('id', id)
        .single();
      
      if (proposalError) throw proposalError;
      
      // Extract client info from proposal content
      const content = proposalData.content as ProposalContent;
      const clientInfo = content?.clientInfo;
      
      if (!clientInfo?.email) {
        throw new Error("No client email found in the proposal");
      }
      
      // Call the edge function to send email
      const emailResponse = await supabase.functions.invoke('send-proposal-invitation', {
        body: JSON.stringify({
          proposalId: id,
          clientEmail: clientInfo.email,
          clientName: clientInfo.name || 'Client',
          invitationToken: token,
          projectName: content?.projectInfo?.name || 'Carbon Credit Project'
        })
      });
      
      if (emailResponse.error) {
        throw new Error(`Email service error: ${emailResponse.error.message}`);
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
      
      toast({
        title: "Invitation Sent",
        description: "An email invitation has been sent to the client.",
      });
      
      // Refresh the proposal list
      if (onProposalUpdate) {
        onProposalUpdate();
      }
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };
  
  const handleResendInvitation = async (id: string) => {
    await handleSendInvitation(id);
  };
  
  return {
    handleSendInvitation,
    handleResendInvitation,
    sending
  };
}
