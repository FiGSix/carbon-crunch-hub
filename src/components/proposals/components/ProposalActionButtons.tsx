
import React from "react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Proposal } from "../types";
import { ProposalInviteButton } from "./ProposalInviteButton";
import { SubmitForReviewButton } from "./SubmitForReviewButton";
import { useAuth } from "@/contexts/auth";

interface ProposalActionButtonsProps {
  proposal: Proposal;
  onProposalUpdate?: () => void;
}

export function ProposalActionButtons({ proposal, onProposalUpdate }: ProposalActionButtonsProps) {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  
  const handleViewProposal = (id: string) => {
    navigate(`/proposals/${id}`);
  };
  
  return (
    <div className="flex justify-end gap-2">
      <Button 
        variant="ghost" 
        size="sm" 
        className="retro-button"
        onClick={() => handleViewProposal(proposal.id)}
      >
        View <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
      
      {/* Only show Submit button for agents with draft proposals */}
      {proposal.status === "draft" && userRole === "agent" && (
        <SubmitForReviewButton 
          proposalId={proposal.id}
          proposalTitle={proposal.name}
          onProposalUpdate={onProposalUpdate} 
        />
      )}
      
      {/* Show invite button based on role and status */}
      <ProposalInviteButton 
        proposal={proposal} 
        onProposalUpdate={onProposalUpdate} 
      />
    </div>
  );
}
