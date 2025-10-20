import { ArrowRight, Percent, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Proposal } from "../types";
import { useAuth } from "@/contexts/auth";
import { useState } from "react";
import { ClientShareOverrideDialog } from "./ClientShareOverrideDialog";
import { ProposalDeleteDialog } from "../view/ProposalDeleteDialog";
import { useProposalActions } from "@/hooks/proposals/view/useProposalActions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getClientSharePercentage } from "@/services/calculations/carbon/pricing";
interface ProposalActionButtonsProps {
  proposal: Proposal;
  onProposalUpdate?: () => void;
}

export function ProposalActionButtons({ proposal, onProposalUpdate }: ProposalActionButtonsProps) {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { toast } = useToast();
  const [showClientShareDialog, setShowClientShareDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const { handleDelete } = useProposalActions(
    async () => onProposalUpdate?.(),
    onProposalUpdate
  );
  
  const handleViewProposal = (id: string) => {
    navigate(`/proposals/${id}`);
  };

  const onDelete = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await handleDelete(proposal.id, user.id);
    }
  };

  const handleSaveClientShare = async (clientShare: number | null) => {
    try {
      const updateData: any = {
        client_share_override_enabled: clientShare !== null,
        client_share_override_set_at: clientShare !== null ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      if (clientShare !== null) {
        updateData.client_share_percentage = clientShare;
        updateData.client_share_override_set_by = (await supabase.auth.getUser()).data.user?.id;
      } else {
        // Recalculate based on portfolio
        const portfolioKWp = proposal.agent_portfolio_kwp || proposal.size || 0;
        updateData.client_share_percentage = getClientSharePercentage(portfolioKWp);
        updateData.client_share_override_set_by = null;
      }

      const { error } = await supabase
        .from('proposals')
        .update(updateData)
        .eq('id', proposal.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: clientShare !== null 
          ? `Client share set to ${clientShare}%`
          : "Client share reset to auto-calculated value",
      });

      setShowClientShareDialog(false);
      if (onProposalUpdate) {
        onProposalUpdate();
      }
    } catch (error) {
      console.error('Error updating client share:', error);
      toast({
        title: "Error",
        description: "Failed to update client share percentage",
        variant: "destructive",
      });
    }
  };

  const autoCalculatedShare = getClientSharePercentage(
    proposal.agent_portfolio_kwp || proposal.size || 0
  );
  
  return (
    <>
      <div className="flex justify-end gap-2">
        {userRole === "admin" && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowClientShareDialog(true)}
          >
            <Percent className="h-4 w-4" />
          </Button>
        )}
        {userRole === "admin" && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          className="retro-button"
          onClick={() => handleViewProposal(proposal.id)}
        >
          View <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {userRole === "admin" && (
        <ClientShareOverrideDialog
          open={showClientShareDialog}
          onOpenChange={setShowClientShareDialog}
          proposal={proposal}
          onSave={handleSaveClientShare}
          autoCalculatedShare={autoCalculatedShare}
        />
      )}

      {userRole === "admin" && (
        <ProposalDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onDelete={onDelete}
          isClient={false}
        />
      )}
    </>
  );
}
