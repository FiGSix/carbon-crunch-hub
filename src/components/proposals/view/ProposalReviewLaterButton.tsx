
import React from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ProposalReviewLaterButtonProps {
  onClick: () => void;
  isReviewLater?: boolean;
}

export function ProposalReviewLaterButton({ onClick, isReviewLater }: ProposalReviewLaterButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={onClick}
            className={`flex items-center gap-1 ${isReviewLater ? 'border-carbon-blue-200 bg-carbon-blue-50 text-carbon-blue-700' : ''}`}
          >
            <Clock className="h-4 w-4" /> 
            {isReviewLater ? 'Remove Review Later' : 'Review Later'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isReviewLater 
            ? 'Remove from Review Later list' 
            : 'Save for review later without taking action now'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
