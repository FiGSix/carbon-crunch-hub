
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useProposalInvitations(onProposalUpdate?: () => void) {
  const { toast } = useToast();
  
  const handleSendInvitation = async (id: string) => {
    try {
      // Generate token and set expiration date (48 hours from now)
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 48);
      
      const { data: token } = await supabase.rpc('generate_secure_token');
      
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
      
      // In a real app, this would trigger an email to the client
      // For now, we'll just show a success message
      toast({
        title: "Invitation Sent",
        description: "Client will receive an email to view this proposal.",
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
    }
  };
  
  const handleResendInvitation = async (id: string) => {
    try {
      // Reset the invitation with a new token and expiration date
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 48);
      
      const { data: token } = await supabase.rpc('generate_secure_token');
      
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
        title: "Invitation Resent",
        description: "Client will receive a new email with updated link.",
      });
      
      if (onProposalUpdate) {
        onProposalUpdate();
      }
    } catch (error) {
      console.error("Error resending invitation:", error);
      toast({
        title: "Error",
        description: "Failed to resend invitation. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return {
    handleSendInvitation,
    handleResendInvitation
  };
}
