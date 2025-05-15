import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { useProposalData } from "@/hooks/proposals/view/useProposalData";

export function ProposalPreviewBanner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { proposal } = useProposalData(id);
  
  // If this is not a preview proposal, don't render anything
  if (!proposal?.is_preview) return null;

  const handleViewOriginal = () => {
    if (proposal.preview_of_id) {
      navigate(`/proposals/${proposal.preview_of_id}`);
    }
  };

  return (
    <Alert className="mb-6 bg-blue-50 border-blue-200">
      <AlertTitle className="flex items-center gap-2 text-blue-800">
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
          <Clock className="h-3 w-3 mr-1" />
          Preview Mode
        </Badge>
      </AlertTitle>
      <AlertDescription className="mt-2 text-blue-700">
        <p>This is a preview of the proposal. Changes made here won't affect the original proposal.</p>
        {proposal.preview_of_id && (
          <Button
            variant="link"
            className="p-0 h-auto font-normal text-blue-800 hover:text-blue-900"
            onClick={handleViewOriginal}
          >
            View original proposal →
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
