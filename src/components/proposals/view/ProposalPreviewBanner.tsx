
import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProposalPreviewBannerProps {
  isPreview: boolean;
  originalProposalId?: string;
  onViewOriginal?: () => void;
}

export function ProposalPreviewBanner({ 
  isPreview, 
  originalProposalId, 
  onViewOriginal 
}: ProposalPreviewBannerProps) {
  if (!isPreview) return null;

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
        {originalProposalId && onViewOriginal && (
          <Button
            variant="link"
            className="p-0 h-auto font-normal text-blue-800 hover:text-blue-900"
            onClick={onViewOriginal}
          >
            View original proposal →
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
