
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

export type { Proposal } from "./ProposalListTypes";

export function ProposalList({ proposals, onProposalUpdate }: ProposalListProps) {
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
            <TableHead>Invitation</TableHead>
            <TableHead className="text-right">Est. Revenue</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {proposals.map((proposal) => (
            <TableRow key={proposal.id}>
              <TableCell className="font-medium">{proposal.name}</TableCell>
              <TableCell>{proposal.client}</TableCell>
              <TableCell>{new Date(proposal.date).toLocaleDateString()}</TableCell>
              <TableCell>{proposal.size.toFixed(2)} MWp</TableCell>
              <TableCell>
                <ProposalStatusBadge status={proposal.status} />
              </TableCell>
              <TableCell>
                <InvitationStatus proposal={proposal} />
              </TableCell>
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
