
import React from "react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Proposal } from "../types";

interface ProposalActionButtonsProps {
  proposal: Proposal;
  onProposalUpdate?: () => void;
}

export function ProposalActionButtons({ proposal, onProposalUpdate }: ProposalActionButtonsProps) {
  const navigate = useNavigate();
  
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
    </div>
  );
}
