
import React from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Proposal } from "../ProposalListTypes";
import { useProposalInvitations } from "../hooks/useProposalInvitations";
import { useAuth } from "@/contexts/AuthContext";

interface ProposalInviteButtonProps {
  proposal: Proposal;
  onProposalUpdate?: () => void;
}

export function ProposalInviteButton({ proposal, onProposalUpdate }: ProposalInviteButtonProps) {
  const { handleSendInvitation, handleResendInvitation } = useProposalInvitations(onProposalUpdate);
  const { userRole } = useAuth();
  
  // Only agents can send invitations
  if (userRole !== "agent") {
    return null;
  }
  
  // Don't render anything for draft proposals
  if (proposal.status === "draft") {
    return null;
  }
  
  // For pending proposals that haven't been sent yet
  if (proposal.status === "pending" && !proposal.invitation_sent_at) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleSendInvitation(proposal.id)}
        className="text-carbon-blue-600"
      >
        Invite <Mail className="h-4 w-4 ml-1" />
      </Button>
    );
  }
  
  // For pending proposals that have been sent but not viewed
  if (proposal.invitation_sent_at && !proposal.invitation_viewed_at) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleResendInvitation(proposal.id)}
        className="text-carbon-blue-600"
      >
        Resend <Mail className="h-4 w-4 ml-1" />
      </Button>
    );
  }
  
  // Don't show invitation buttons for proposals that have been viewed
  return null;
}
