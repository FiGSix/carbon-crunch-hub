
import React from "react";
import { FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientInfoSection } from "./ClientInfoSection";
import { ProjectInfoSection } from "./ProjectInfoSection";
import { CarbonCreditSection } from "@/components/proposals/summary/CarbonCreditSection";
import { RevenueDistributionSection } from "@/components/proposals/summary/RevenueDistributionSection";
import { ProposalStatusFooter } from "./ProposalStatusFooter";
import { ProposalActionFooter } from "./ProposalActionFooter";
import { ProposalArchivedBanner } from "./ProposalArchivedBanner";
import { useAuth } from "@/contexts/auth";
import { logger } from "@/lib/logger";
import { usePreviewProposal } from "@/hooks/proposal/usePreviewProposal";
import { ProposalPreviewBanner } from "./ProposalPreviewBanner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ProposalDetailsProps {
  proposal: {
    id: string;
    title: string;
    status: string;
    content: any;
    signed_at: string | null;
    archived_at: string | null;
    archived_by: string | null;
    review_later_until: string | null;
  };
  token?: string | null;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  isReviewLater?: boolean;
  showActions?: boolean;
  is_preview?: boolean;
  preview_of_id?: string;
}

export function ProposalDetails({ 
  proposal, 
  token, 
  onApprove, 
  onReject,
  isReviewLater,
  showActions = false,
  is_preview,
  preview_of_id
}: ProposalDetailsProps) {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const { createPreview, loading: previewLoading } = usePreviewProposal();
  
  const handleCreatePreview = async () => {
    try {
      const preview = await createPreview(proposal.id);
      navigate(`/proposals/${preview.id}`);
    } catch (error) {
      logger.error("Failed to create preview:", error);
    }
  };
  
  const handleViewOriginal = () => {
    if (preview_of_id) {
      navigate(`/proposals/${preview_of_id}`);
    }
  };
  
  // Extract project info from the proposal content
  const projectInfo = proposal.content?.projectInfo || {};
  
  return (
    <Card className="retro-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Proposal Details
          </div>
          {!is_preview && userRole === 'agent' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreatePreview}
              disabled={previewLoading}
            >
              Create Preview
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Review the details of this carbon credit proposal
        </CardDescription>
      </CardHeader>
      
      <ProposalPreviewBanner 
        isPreview={is_preview || false}
        originalProposalId={preview_of_id}
        onViewOriginal={handleViewOriginal}
      />
      
      <CardContent>
        <div className="space-y-8">
          <ClientInfoSection clientInfo={proposal.content?.clientInfo || {}} />
          <ProjectInfoSection projectInfo={projectInfo} />
          
          {projectInfo.size && (
            <>
              <CarbonCreditSection systemSize={projectInfo.size} />
              <RevenueDistributionSection systemSize={projectInfo.size} />
            </>
          )}
        </div>
      </CardContent>
      
      <ProposalArchivedBanner 
        archivedAt={proposal.archived_at} 
        reviewLaterUntil={proposal.review_later_until}
      />
      
      {!proposal.archived_at && !isReviewLater && proposal.status !== 'pending' && (
        <ProposalStatusFooter 
          status={proposal.status} 
          signedAt={proposal.signed_at} 
        />
      )}
      
      {showActions && (
        <ProposalActionFooter 
          onApprove={onApprove}
          onReject={onReject}
          showActions={showActions}
        />
      )}
    </Card>
  );
}
