
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

export interface Proposal {
  id: string; // Changed from number to string to match Supabase UUID
  name: string;
  client: string;
  date: string;
  size: number;
  status: string;
  revenue: number;
}

interface ProposalListProps {
  proposals: Proposal[];
}

export function ProposalList({ proposals }: ProposalListProps) {
  const navigate = useNavigate();
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-carbon-green-100 text-carbon-green-700 hover:bg-carbon-green-200">Approved</Badge>;
      case "pending":
        return <Badge className="bg-carbon-blue-100 text-carbon-blue-700 hover:bg-carbon-blue-200">Pending</Badge>;
      case "rejected":
        return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">Rejected</Badge>;
      case "draft":
        return <Badge className="bg-carbon-gray-100 text-carbon-gray-700 hover:bg-carbon-gray-200">Draft</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  const handleViewProposal = (id: string) => {
    navigate(`/proposals/${id}`);
  };
  
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
              <TableCell>{getStatusBadge(proposal.status)}</TableCell>
              <TableCell className="text-right">R {proposal.revenue.toLocaleString()}</TableCell>
              <TableCell className="text-right">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-carbon-blue-600"
                  onClick={() => handleViewProposal(proposal.id)}
                >
                  View <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
