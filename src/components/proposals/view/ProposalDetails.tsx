
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
import { useAuth } from "@/contexts/AuthContext";

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
}

export function ProposalDetails({ 
  proposal, 
  token, 
  onApprove, 
  onReject,
  isReviewLater,
  showActions
}: ProposalDetailsProps) {
  // Extract client and project info from the proposal content
  const clientInfo = proposal.content?.clientInfo || {};
  const projectInfo = proposal.content?.projectInfo || {};
  const { userRole } = useAuth();
  
  console.log("ProposalDetails - showActions:", showActions);
  
  return (
    <Card className="retro-card">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Proposal Details
        </CardTitle>
        <CardDescription>
          Review the details of this carbon credit proposal
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          <ClientInfoSection clientInfo={clientInfo} />
          <ProjectInfoSection projectInfo={projectInfo} />
          
          {projectInfo.size && (
            <>
              <CarbonCreditSection systemSize={projectInfo.size} />
              <RevenueDistributionSection systemSize={projectInfo.size} />
            </>
          )}
        </div>
      </CardContent>
      
      {/* Show archived or review later banner if applicable */}
      <ProposalArchivedBanner 
        archivedAt={proposal.archived_at} 
        reviewLaterUntil={proposal.review_later_until}
      />
      
      {/* Show status footer if not archived and not in review later state */}
      {!proposal.archived_at && !isReviewLater && (
        <ProposalStatusFooter 
          status={proposal.status} 
          signedAt={proposal.signed_at} 
        />
      )}
      
      <ProposalActionFooter 
        onApprove={onApprove}
        onReject={onReject}
        showActions={showActions}
      />
    </Card>
  );
}
