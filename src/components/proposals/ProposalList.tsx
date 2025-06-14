
import React, { useEffect, memo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProposalStatusDropdown } from "./components/ProposalStatusDropdown";
import { ProposalActionButtons } from "./components/ProposalActionButtons";
import { ProposalListProps, ProposalListItem } from "@/types/proposals";
import { useAuth } from "@/contexts/auth";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { logger } from "@/lib/logger";
import { UserRole } from "@/contexts/auth/types";
import { formatSystemSizeForDisplay } from "@/lib/calculations/carbon/simplified";

// Define the props interface for the MemoizedProposalRow component
interface ProposalRowProps {
  proposal: ProposalListItem;
  userRole: UserRole | null;
  isCurrentUser: boolean;
  onProposalUpdate?: () => void;
}

// Create a memoized TableRow component with proper typing to prevent unnecessary re-renders
const MemoizedProposalRow = memo<ProposalRowProps>(({
  proposal,
  userRole,
  isCurrentUser,
  onProposalUpdate
}) => {
  return <TableRow className={isCurrentUser ? "bg-carbon-green-50" : ""}>
      <TableCell className="font-medium">{proposal.name}</TableCell>
      <TableCell>{proposal.client}</TableCell>
      <TableCell>{new Date(proposal.date).toLocaleDateString()}</TableCell>
      <TableCell>{formatSystemSizeForDisplay(proposal.size)}</TableCell>
      <TableCell>
        <ProposalStatusDropdown proposalId={proposal.id} currentStatus={proposal.status} onStatusUpdate={onProposalUpdate} />
      </TableCell>
      {userRole === "admin" && <TableCell>
          {proposal.agent || "Unassigned"}
        </TableCell>}
      <TableCell className="text-center">R {proposal.revenue.toLocaleString()}</TableCell>
      <TableCell className="text-right">
        <ProposalActionButtons proposal={proposal} onProposalUpdate={onProposalUpdate} />
      </TableCell>
    </TableRow>;
});
MemoizedProposalRow.displayName = "MemoizedProposalRow";

export function ProposalList({
  proposals,
  onProposalUpdate
}: ProposalListProps) {
  const {
    userRole,
    user
  } = useAuth();

  // Create a contextualized logger
  const proposalLogger = logger.withContext({
    component: 'ProposalList',
    feature: 'proposals'
  });

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
    const handleProposalStatusChange = (event: Event) => {
      // Cast event to CustomEvent to access detail property
      const customEvent = event as CustomEvent<{
        id: string;
        status: string;
      }>;
      proposalLogger.info("Status change event detected", customEvent.detail);
      if (onProposalUpdate) {
        proposalLogger.info("Triggering proposal list refresh");
        onProposalUpdate();
      }
    };
    window.addEventListener('proposal-status-changed', handleProposalStatusChange as EventListener);
    return () => {
      window.removeEventListener('proposal-status-changed', handleProposalStatusChange as EventListener);
    };
  }, [onProposalUpdate, proposalLogger]);

  // No proposals found state
  if (proposals.length === 0) {
    return <Alert className="my-4">
        <AlertTitle>No proposals found</AlertTitle>
        <AlertDescription>
          {userRole === "agent" ? "You don't have any proposals assigned to you. Click 'Create New Proposal' to get started." : userRole === "client" ? "You don't have any proposals yet. An agent will create a proposal for you." : "No proposals found matching your criteria. Try changing the filters or create a new proposal."}
        </AlertDescription>
      </Alert>;
  }
  return <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project Name</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Status</TableHead>
            {userRole === "admin" && <TableHead>Agent</TableHead>}
            <TableHead className="text-center">First
Yr Est. Revenue</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {proposals.map(proposal => <MemoizedProposalRow key={proposal.id} proposal={proposal} userRole={userRole} isCurrentUser={proposal.agent_id === user?.id} onProposalUpdate={onProposalUpdate} />)}
        </TableBody>
      </Table>
    </div>;
}
