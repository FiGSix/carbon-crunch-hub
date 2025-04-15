
import React, { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Proposal } from "../ProposalListTypes";
import { useProposalInvitations } from "../hooks/useProposalInvitations";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ProposalInviteButtonProps {
  proposal: Proposal;
  onProposalUpdate?: () => void;
}

export function ProposalInviteButton({ proposal, onProposalUpdate }: ProposalInviteButtonProps) {
  const { handleSendInvitation, handleResendInvitation, sending } = useProposalInvitations(onProposalUpdate);
  const { userRole } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Only agents can send invitations
  if (userRole !== "agent") {
    return null;
  }
  
  // Don't render anything for draft proposals
  if (proposal.status === "draft") {
    return null;
  }

  const handleInvite = async () => {
    setIsProcessing(true);
    try {
      // For pending proposals that haven't been sent yet
      const result = await handleSendInvitation(proposal.id);
      if (!result.success) {
        toast({
          title: "Invitation Failed",
          description: "There was an error sending the invitation. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error in invitation process:", error);
      toast({
        title: "Invitation Error",
        description: "An unexpected error occurred while sending the invitation.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResend = async () => {
    setIsProcessing(true);
    try {
      // For pending proposals that have been sent but not viewed
      const result = await handleResendInvitation(proposal.id);
      if (!result.success) {
        toast({
          title: "Resend Failed",
          description: "There was an error resending the invitation. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error in resend process:", error);
      toast({
        title: "Resend Error",
        description: "An unexpected error occurred while resending the invitation.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // For pending proposals that haven't been sent yet
  if (proposal.status === "pending" && !proposal.invitation_sent_at) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleInvite}
        className="text-carbon-blue-600"
        disabled={isProcessing || sending}
      >
        {isProcessing || sending ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Sending...
          </>
        ) : (
          <>
            Invite <Mail className="h-4 w-4 ml-1" />
          </>
        )}
      </Button>
    );
  }
  
  // For pending proposals that have been sent but not viewed
  if (proposal.invitation_sent_at && !proposal.invitation_viewed_at) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleResend}
        className="text-carbon-blue-600"
        disabled={isProcessing || sending}
      >
        {isProcessing || sending ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Sending...
          </>
        ) : (
          <>
            Resend <Mail className="h-4 w-4 ml-1" />
          </>
        )}
      </Button>
    );
  }
  
  // Don't show invitation buttons for proposals that have been viewed
  return null;
}
