
import React from "react";
import { ArrowRight, Eye } from "lucide-react";
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

  const handleViewPDF = () => {
    if (proposal.pdf_url) {
      window.open(proposal.pdf_url, '_blank');
    }
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
      
      {/* Simple PDF View Button - only show if PDF exists */}
      {proposal.pdf_url && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="retro-button"
          onClick={handleViewPDF}
        >
          <Eye className="h-4 w-4 mr-1" />
          View PDF
        </Button>
      )}
    </div>
  );
}
