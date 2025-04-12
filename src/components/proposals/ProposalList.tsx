
import { ArrowRight, Mail, CheckCircle2, Clock } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Proposal {
  id: string;
  name: string;
  client: string;
  date: string;
  size: number;
  status: string;
  revenue: number;
  invitation_sent_at?: string;
  invitation_viewed_at?: string;
  invitation_expires_at?: string;
}

interface ProposalListProps {
  proposals: Proposal[];
  onProposalUpdate?: () => void;
}

export function ProposalList({ proposals, onProposalUpdate }: ProposalListProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
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
  
  const getInvitationStatus = (proposal: Proposal) => {
    if (proposal.invitation_viewed_at) {
      return (
        <div className="flex items-center text-carbon-green-600">
          <CheckCircle2 className="h-4 w-4 mr-1" />
          <span className="text-xs">Viewed</span>
        </div>
      );
    } else if (proposal.invitation_sent_at) {
      if (proposal.invitation_expires_at && new Date(proposal.invitation_expires_at) < new Date()) {
        return (
          <div className="flex items-center text-carbon-gray-500">
            <Clock className="h-4 w-4 mr-1" />
            <span className="text-xs">Expired</span>
          </div>
        );
      }
      return (
        <div className="flex items-center text-carbon-blue-600">
          <Mail className="h-4 w-4 mr-1" />
          <span className="text-xs">Sent</span>
        </div>
      );
    }
    return null;
  };
  
  const handleViewProposal = (id: string) => {
    navigate(`/proposals/${id}`);
  };
  
  const handleSendInvitation = async (id: string) => {
    try {
      // Generate token and set expiration date (48 hours from now)
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 48);
      
      const { data: token } = await supabase.rpc('generate_secure_token');
      
      // Update the proposal with invitation details
      const { error } = await supabase
        .from('proposals')
        .update({
          invitation_token: token,
          invitation_sent_at: new Date().toISOString(),
          invitation_expires_at: expirationDate.toISOString(),
          invitation_viewed_at: null
        })
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      // In a real app, this would trigger an email to the client
      // For now, we'll just show a success message
      toast({
        title: "Invitation Sent",
        description: "Client will receive an email to view this proposal.",
      });
      
      // Refresh the proposal list
      if (onProposalUpdate) {
        onProposalUpdate();
      }
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleResendInvitation = async (id: string) => {
    try {
      // Reset the invitation with a new token and expiration date
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 48);
      
      const { data: token } = await supabase.rpc('generate_secure_token');
      
      const { error } = await supabase
        .from('proposals')
        .update({
          invitation_token: token,
          invitation_sent_at: new Date().toISOString(),
          invitation_expires_at: expirationDate.toISOString(),
          invitation_viewed_at: null
        })
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Invitation Resent",
        description: "Client will receive a new email with updated link.",
      });
      
      if (onProposalUpdate) {
        onProposalUpdate();
      }
    } catch (error) {
      console.error("Error resending invitation:", error);
      toast({
        title: "Error",
        description: "Failed to resend invitation. Please try again.",
        variant: "destructive",
      });
    }
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
              <TableCell>{getStatusBadge(proposal.status)}</TableCell>
              <TableCell>{getInvitationStatus(proposal)}</TableCell>
              <TableCell className="text-right">R {proposal.revenue.toLocaleString()}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-carbon-blue-600"
                    onClick={() => handleViewProposal(proposal.id)}
                  >
                    View <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                  
                  {proposal.status === "draft" ? null : (
                    proposal.invitation_sent_at && !proposal.invitation_viewed_at ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendInvitation(proposal.id)}
                        className="text-carbon-blue-600"
                      >
                        Resend <Mail className="h-4 w-4 ml-1" />
                      </Button>
                    ) : !proposal.invitation_viewed_at ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendInvitation(proposal.id)}
                        className="text-carbon-blue-600"
                      >
                        Invite <Mail className="h-4 w-4 ml-1" />
                      </Button>
                    ) : null
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
