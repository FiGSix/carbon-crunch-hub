
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
import { ProposalData, ProjectInformation } from "@/types/proposals";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { formatSystemSizeForDisplay } from "@/lib/calculations/carbon/normalization";

interface ProposalDetailsProps {
  proposal: ProposalData;
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
  isReviewLater = false,
  showActions = false
}: ProposalDetailsProps) {
  const { userRole } = useAuth();
  
  // Extract project info from the proposal content and properly type it
  const projectInfo = (proposal.content?.projectInfo || {}) as ProjectInformation;
  
  // Get the client ID for portfolio-based pricing
  const clientId = proposal.client_reference_id || proposal.client_id;
  
  // Check if this proposal has client-specific revenue data
  const hasClientSpecificRevenue = proposal.content?.clientSpecificRevenue && 
    Object.keys(proposal.content.clientSpecificRevenue).length > 0;
  
  // Check if this is a portfolio-based calculation
  const isPortfolioBased = proposal.content?.calculationMetadata?.portfolioBasedPricing;
  const portfolioSize = proposal.content?.portfolioSize;
  
  return (
    <Card className="retro-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Proposal Details
          </div>
        </CardTitle>
        <CardDescription>
          Review the details of this carbon credit proposal
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-8">
          {/* Show calculation transparency info */}
          {isPortfolioBased && portfolioSize && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Portfolio-based calculation:</strong> This proposal uses portfolio-based pricing with a total portfolio size of {formatSystemSizeForDisplay(portfolioSize)}, 
                which provides enhanced client share percentages and accurate revenue projections.
                {hasClientSpecificRevenue && " Revenue figures reflect the client's actual share based on their portfolio size."}
              </AlertDescription>
            </Alert>
          )}
          
          <ClientInfoSection clientInfo={proposal.content?.clientInfo || {}} />
          <ProjectInfoSection projectInfo={projectInfo} />
          
          {projectInfo.size && (
            <>
              <CarbonCreditSection 
                systemSize={projectInfo.size} 
                commissionDate={projectInfo.commissionDate}
                selectedClientId={clientId}
                proposalId={proposal.id}
              />
              <RevenueDistributionSection 
                systemSize={projectInfo.size} 
                selectedClientId={clientId}
                proposalId={proposal.id}
              />
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
      
      {/* Show action buttons only when authenticated and has permission */}
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
