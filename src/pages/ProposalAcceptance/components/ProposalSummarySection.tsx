import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProposalData } from "@/types/proposals";
import { Building2, Calendar, DollarSign, Zap } from "lucide-react";

interface ProposalSummarySectionProps {
  proposal: ProposalData;
}

export function ProposalSummarySection({ proposal }: ProposalSummarySectionProps) {
  const projectInfo = proposal.content?.projectInfo;
  const clientInfo = proposal.content?.clientInfo;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{proposal.title}</CardTitle>
        <p className="text-muted-foreground">Proposal Summary</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Client Information */}
        {clientInfo && (
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">CLIENT INFORMATION</h3>
            <div className="space-y-1">
              <p className="font-medium">{clientInfo.name}</p>
              <p className="text-sm text-muted-foreground">{clientInfo.email}</p>
              {clientInfo.companyName && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {clientInfo.companyName}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Project Details */}
        {projectInfo && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projectInfo.size && (
              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <Zap className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">System Size</p>
                  <p className="font-semibold">{projectInfo.size}</p>
                </div>
              </div>
            )}
            
            {projectInfo.address && (
              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <Building2 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-semibold">{projectInfo.address}</p>
                </div>
              </div>
            )}
            
            {projectInfo.commissionDate && (
              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Commission Date</p>
                  <p className="font-semibold">{projectInfo.commissionDate}</p>
                </div>
              </div>
            )}

            {proposal.carbon_credits && (
              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Annual Carbon Credits</p>
                  <p className="font-semibold">{proposal.carbon_credits.toLocaleString()} credits/year</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Financial Summary */}
        {(proposal.client_share_percentage || proposal.carbon_credits) && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <h3 className="font-semibold mb-3">Revenue Projection</h3>
            <div className="grid grid-cols-2 gap-4">
              {proposal.client_share_percentage && (
                <div>
                  <p className="text-sm text-muted-foreground">Your Share</p>
                  <p className="text-2xl font-bold text-primary">{proposal.client_share_percentage}%</p>
                </div>
              )}
              {(proposal.content?.financials?.totalClientRevenue || (proposal.carbon_credits && proposal.client_share_percentage)) && (
                <div>
                  <p className="text-sm text-muted-foreground">Total Estimated Revenue</p>
                  <p className="text-2xl font-bold text-primary">
                    R{(proposal.content?.financials?.totalClientRevenue || ((proposal.carbon_credits * proposal.client_share_percentage * 10) / 100)).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
