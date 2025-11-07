
import { useEffect, memo, useMemo, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ProposalActionButtons } from "./components/ProposalActionButtons";
import { ClientShareCell } from "./components/ClientShareCell";
import { EmailEngagementBadge } from "./components/EmailEngagementBadge";
import { ProposalEngagementBadge } from "./list/ProposalEngagementBadge";
import { ProposalListProps, ProposalListItem } from "@/types/proposals";
import { useAuth } from "@/contexts/auth";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { logger } from "@/lib/logger";
import { UserRole } from "@/contexts/auth/types";
import { formatSystemSizeForDisplay } from "@/lib/calculations/carbon";
import { CheckCircle2, XCircle } from "lucide-react";

// Define the props interface for the MemoizedProposalRow component
interface ProposalRowProps {
  proposal: ProposalListItem;
  userRole: UserRole | null;
  isCurrentUser: boolean;
  onProposalUpdate?: () => void;
}

// Optimized row component with deep comparison for proposal data
const MemoizedProposalRow = memo<ProposalRowProps>(({
  proposal,
  userRole,
  isCurrentUser,
  onProposalUpdate
}) => {
  const formattedDate = useMemo(
    () => new Date(proposal.date).toLocaleDateString(),
    [proposal.date]
  );
  
  const formattedSize = useMemo(
    () => formatSystemSizeForDisplay(proposal.size),
    [proposal.size]
  );
  
  const formattedRevenue = useMemo(
    () => `R ${proposal.revenue.toLocaleString()}`,
    [proposal.revenue]
  );

  return (
    <TableRow className={isCurrentUser ? "bg-carbon-green-50" : ""}>
      <TableCell className="font-medium">{proposal.name}</TableCell>
      <TableCell>{proposal.client}</TableCell>
      <TableCell>
        {proposal.isMultiPhase ? (
          <div className="flex items-center gap-2">
            <span>{formattedDate}</span>
            <Badge variant="outline" className="text-xs">Multi</Badge>
          </div>
        ) : (
          formattedDate
        )}
      </TableCell>
      <TableCell>{formattedSize}</TableCell>
      <TableCell>
        <div className="flex flex-col gap-1.5">
          {/* Status hierarchy: Draft → Sent → Delivered/Opened/Clicked → Approved/Rejected → Signed → Onboarding → Review → Audit */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Audit Ready (highest priority) */}
            {proposal.audit_ready ? (
              <Badge variant="outline" className="gap-1 text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                Audit
              </Badge>
            ) : proposal.submitted_for_review ? (
              <Badge variant="outline" className="gap-1 text-xs bg-violet-50 text-violet-700 border-violet-200">
                Review
              </Badge>
            ) : proposal.onboarding_complete ? (
              <Badge variant="outline" className="gap-1 text-xs bg-cyan-50 text-cyan-700 border-cyan-200">
                Onboarding
              </Badge>
            ) : proposal.signed_at ? (
              <Badge variant="outline" className="gap-1 text-xs bg-purple-50 text-purple-700 border-purple-200">
                <CheckCircle2 className="h-3 w-3" />
                Signed
              </Badge>
            ) : proposal.status === 'approved' ? (
              <Badge variant="outline" className="gap-1 text-xs bg-green-50 text-green-700 border-green-200">
                <CheckCircle2 className="h-3 w-3" />
                Approved
              </Badge>
            ) : proposal.status === 'rejected' ? (
              <Badge variant="outline" className="gap-1 text-xs bg-red-50 text-red-700 border-red-200">
                <XCircle className="h-3 w-3" />
                Rejected
              </Badge>
            ) : proposal.last_email_event_type ? (
              <EmailEngagementBadge 
                eventType={proposal.last_email_event_type} 
                sentAt={proposal.last_email_sent_at}
              />
            ) : proposal.invitation_sent_at ? (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                Sent
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Draft
              </Badge>
            )}
            
            {/* View count badge (supplementary info) */}
            {proposal.engagement_count && proposal.engagement_count > 0 && !proposal.signed_at && proposal.status !== 'approved' && proposal.status !== 'rejected' && (
              <ProposalEngagementBadge 
                engagementCount={proposal.engagement_count}
                last_engagement_at={proposal.last_engagement_at}
              />
            )}
          </div>
        </div>
      </TableCell>
      {userRole === "admin" && (
        <TableCell>{proposal.agent || "Unassigned"}</TableCell>
      )}
      {userRole === "admin" && (
        <TableCell>
          <ClientShareCell proposal={proposal} />
        </TableCell>
      )}
      <TableCell className="text-center">{formattedRevenue}</TableCell>
      <TableCell className="text-right">
        <ProposalActionButtons 
          proposal={proposal} 
          onProposalUpdate={onProposalUpdate} 
        />
      </TableCell>
    </TableRow>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.proposal.id === nextProps.proposal.id &&
    prevProps.proposal.status === nextProps.proposal.status &&
    prevProps.proposal.revenue === nextProps.proposal.revenue &&
    prevProps.proposal.last_email_event_type === nextProps.proposal.last_email_event_type &&
    prevProps.proposal.engagement_count === nextProps.proposal.engagement_count &&
    prevProps.userRole === nextProps.userRole &&
    prevProps.isCurrentUser === nextProps.isCurrentUser
  );
});

MemoizedProposalRow.displayName = "MemoizedProposalRow";

export function ProposalList({ proposals, onProposalUpdate }: ProposalListProps) {
  const { userRole, user } = useAuth();

  // Create a contextualized logger
  const proposalLogger = useMemo(() => logger.withContext({
    component: 'ProposalList',
    feature: 'proposals'
  }), []);

  // Memoize the empty state message
  const emptyStateMessage = useMemo(() => {
    if (userRole === "agent") {
      return "You don't have any proposals assigned to you. Click 'Create New Proposal' to get started.";
    } else if (userRole === "client") {
      return "You don't have any proposals yet. An agent will create a proposal for you.";
    } else {
      return "No proposals found matching your criteria. Try changing the filters or create a new proposal.";
    }
  }, [userRole]);

  // Memoize the status change handler
  const handleProposalStatusChange = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<{ id: string; status: string; }>;
    proposalLogger.info("Status change event detected", customEvent.detail);
    if (onProposalUpdate) {
      proposalLogger.info("Triggering proposal list refresh");
      onProposalUpdate();
    }
  }, [onProposalUpdate, proposalLogger]);

  // Enhanced logging for debugging
  useEffect(() => {
    proposalLogger.debug("Component rendered", {
      userRole,
      userId: user?.id,
      proposalsCount: proposals.length
    });
  }, [proposals.length, userRole, user, proposalLogger]);

  // Listen for global proposal status change events
  useEffect(() => {
    window.addEventListener('proposal-status-changed', handleProposalStatusChange as EventListener);
    return () => {
      window.removeEventListener('proposal-status-changed', handleProposalStatusChange as EventListener);
    };
  }, [handleProposalStatusChange]);

  // No proposals found state
  if (proposals.length === 0) {
    return (
      <Alert className="my-4">
        <AlertTitle>No proposals found</AlertTitle>
        <AlertDescription>{emptyStateMessage}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project Name</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Status</TableHead>
            {userRole === "admin" && <TableHead>Agent</TableHead>}
            {userRole === "admin" && <TableHead>Client Share</TableHead>}
            <TableHead className="text-center">First Yr Est. Revenue</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {proposals.map(proposal => (
            <MemoizedProposalRow 
              key={proposal.id} 
              proposal={proposal} 
              userRole={userRole} 
              isCurrentUser={proposal.agent_id === user?.id} 
              onProposalUpdate={onProposalUpdate} 
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
