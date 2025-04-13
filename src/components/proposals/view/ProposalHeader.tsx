
import React from "react";
import { CheckCircle2, Archive, Clock } from "lucide-react";
import { ProposalExportButton } from "@/components/proposals/components/ProposalExportButton";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProposalReviewLaterButton } from "./ProposalReviewLaterButton";

interface ProposalHeaderProps {
  title: string;
  showInvitationBadge: boolean;
  projectSize?: string;
  projectName?: string;
  canArchive?: boolean;
  isArchived?: boolean;
  isReviewLater?: boolean;
  onArchiveClick?: () => void;
  onReviewLaterClick?: () => void;
}

export function ProposalHeader({ 
  title, 
  showInvitationBadge, 
  projectSize, 
  projectName,
  canArchive,
  isArchived,
  isReviewLater,
  onArchiveClick,
  onReviewLaterClick
}: ProposalHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
      <div>
        <h1 className="text-3xl font-bold text-carbon-gray-900">{title}</h1>
        <p className="text-carbon-gray-600">Carbon Credit Proposal</p>
      </div>
      <div className="flex items-center gap-3">
        {showInvitationBadge && (
          <div className="flex items-center bg-carbon-green-50 text-carbon-green-700 px-4 py-2 rounded-lg">
            <CheckCircle2 className="h-5 w-5 mr-2" />
            <span>Viewing invitation</span>
          </div>
        )}
        
        {!isArchived && onReviewLaterClick && (
          <ProposalReviewLaterButton 
            onClick={onReviewLaterClick} 
            isReviewLater={isReviewLater}
          />
        )}
        
        {canArchive && !isArchived && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onArchiveClick}
                  className="flex items-center gap-1"
                >
                  <Archive className="h-4 w-4" /> Archive
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Archive this proposal</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {projectSize && projectName && (
          <ProposalExportButton 
            systemSize={projectSize} 
            projectName={projectName}
          />
        )}
      </div>
    </div>
  );
}
