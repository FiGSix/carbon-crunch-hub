
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

export type { Proposal } from "./ProposalListTypes";

export function ProposalList({ proposals, onProposalUpdate }: ProposalListProps) {
  const { userRole, user } = useAuth();
  
  console.log("ProposalList - userRole:", userRole, "userId:", user?.id);
  console.log("ProposalList - received proposals count:", proposals.length);
  
  // Server-side filtering is already happening in useProposalFetcher, so we don't need
  // to filter again on the client side. This was causing the issue with agents not seeing proposals.
  
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
