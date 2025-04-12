
import React from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Proposal } from "../ProposalListTypes";
import { useProposalInvitations } from "../hooks/useProposalInvitations";

interface ProposalInviteButtonProps {
  proposal: Proposal;
  onProposalUpdate?: () => void;
}

export function ProposalInviteButton({ proposal, onProposalUpdate }: ProposalInviteButtonProps) {
  const { handleSendInvitation, handleResendInvitation } = useProposalInvitations(onProposalUpdate);
  
  if (proposal.status === "draft") {
    return null;
  }
  
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
  
  if (!proposal.invitation_viewed_at) {
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
  
  return null;
}
