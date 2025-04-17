
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { ProposalStatusBadge } from "./components/ProposalStatusBadge";
import { InvitationStatus } from "./components/InvitationStatus";
import { ProposalActionButtons } from "./components/ProposalActionButtons";
import { ProposalListProps } from "./ProposalListTypes";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useEffect } from "react";

export type { Proposal } from "./ProposalListTypes";

export function ProposalList({ proposals, onProposalUpdate }: ProposalListProps) {
  const { userRole, user } = useAuth();
  
  // Enhanced logging for debugging
  useEffect(() => {
    console.log("ProposalList - userRole:", userRole, "userId:", user?.id);
    console.log("ProposalList - received proposals count:", proposals.length);
    
    // Log the first proposal for debugging if available
    if (proposals.length > 0) {
      console.log("ProposalList - first proposal sample:", {
        id: proposals[0].id,
        name: proposals[0].name,
        agent_id: proposals[0].agent_id,
        status: proposals[0].status
      });
    }
  }, [proposals, userRole, user]);
  
  // Listen for global proposal status change events
  useEffect(() => {
    const handleProposalStatusChange = (event: Event) => {
      // Cast event to CustomEvent to access detail property
      const customEvent = event as CustomEvent<{id: string, status: string}>;
      console.log("ProposalList detected status change event:", customEvent.detail);
      
      if (onProposalUpdate) {
        console.log("Triggering proposal list refresh after status change");
        onProposalUpdate();
      }
    };
    
    window.addEventListener('proposal-status-changed', handleProposalStatusChange as EventListener);
    
    return () => {
      window.removeEventListener('proposal-status-changed', handleProposalStatusChange as EventListener);
    };
  }, [onProposalUpdate]);
  
  // No proposals found state
  if (proposals.length === 0) {
    return (
      <Alert className="my-4">
        <AlertTitle>No proposals found</AlertTitle>
        <AlertDescription>
          {userRole === "agent" 
            ? "You don't have any proposals assigned to you. Only proposals explicitly assigned to you will appear here."
            : userRole === "client"
              ? "You don't have any proposals yet. An agent will create a proposal for you."
              : "No proposals found matching your criteria. Try changing the filters."}
        </AlertDescription>
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
            <TableHead>Size (MWp)</TableHead>
            <TableHead>Status</TableHead>
            {userRole === "agent" && <TableHead>Invitation</TableHead>}
            {userRole === "admin" && <TableHead>Agent</TableHead>}
            <TableHead className="text-right">Est. Revenue</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {proposals.map((proposal) => (
            <TableRow key={proposal.id} className={proposal.agent_id === user?.id ? "bg-carbon-green-50" : ""}>
              <TableCell className="font-medium">{proposal.name}</TableCell>
              <TableCell>{proposal.client}</TableCell>
              <TableCell>{new Date(proposal.date).toLocaleDateString()}</TableCell>
              <TableCell>{proposal.size.toFixed(2)} MWp</TableCell>
              <TableCell>
                <ProposalStatusBadge 
                  status={proposal.status} 
                  reviewLater={!!proposal.review_later_until}
                />
              </TableCell>
              {userRole === "agent" && (
                <TableCell>
                  <InvitationStatus proposal={proposal} />
                </TableCell>
              )}
              {userRole === "admin" && (
                <TableCell>
                  {proposal.agent || "Unassigned"}
                </TableCell>
              )}
              <TableCell className="text-right">R {proposal.revenue.toLocaleString()}</TableCell>
              <TableCell className="text-right">
                <ProposalActionButtons 
                  proposal={proposal} 
                  onProposalUpdate={onProposalUpdate}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
