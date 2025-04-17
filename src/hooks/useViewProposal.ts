
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth";
import { useProposalData } from "./proposal/useProposalData";
import { useProposalOperations } from "./proposal/useProposalOperations";
import { ProposalData } from "@/components/proposals/view/types";
import { supabase } from "@/integrations/supabase/client";

export function useViewProposal(id?: string, token?: string | null) {
  const { user } = useAuth();
  const { proposal: initialProposal, loading: initialLoading, error: initialError, clientEmail, fetchProposal } = useProposalData(id, token);
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { loading: operationLoading, approveProposal, rejectProposal, archiveProposal, toggleReviewLater } = useProposalOperations();
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  
  // Update local state when initial data loads
  useEffect(() => {
    if (!initialLoading) {
      setProposal(initialProposal);
      setLoading(initialLoading);
      setError(initialError);
    }
  }, [initialProposal, initialLoading, initialError]);
  
  // Mark invitation as viewed when opening with token
  useEffect(() => {
    const markInvitationViewed = async () => {
      if (token && proposal?.id && !proposal.invitation_viewed_at) {
        // Update the invitation_viewed_at timestamp
        await supabase
          .from('proposals')
          .update({ invitation_viewed_at: new Date().toISOString() })
          .eq('id', proposal.id)
          .eq('invitation_token', token);
          
        // Create notification for the agent that client viewed the proposal
        if (proposal.agent_id) {
          await supabase.functions.invoke('create-notification', {
            body: {
              userId: proposal.agent_id,
              title: "Proposal Viewed",
              message: `The client has viewed your proposal: ${proposal.title}`,
              type: "info",
              relatedId: proposal.id,
              relatedType: "proposal"
            }
          });
        }
      }
    };
    
    if (!loading && proposal) {
      markInvitationViewed();
    }
  }, [token, proposal, loading]);
  
  // Handle operations on the proposal
  const handleApprove = async () => {
    if (!proposal?.id) return;
    
    const result = await approveProposal(proposal.id);
    if (result.success) {
      console.log("Proposal approved successfully, refreshing data");
      // Refresh data from the server
      if (id) {
        await fetchProposal(id, token);
      }
      
      // Also update local state immediately for better UX
      setProposal(prev => prev ? {
        ...prev, 
        status: 'approved', 
        signed_at: new Date().toISOString(),
        review_later_until: null
      } : null);
    }
  };
  
  const handleReject = async () => {
    if (!proposal?.id) return;
    
    const result = await rejectProposal(proposal.id);
    if (result.success) {
      console.log("Proposal rejected successfully, refreshing data");
      // Refresh data from the server
      if (id) {
        await fetchProposal(id, token);
      }
      
      // Also update local state immediately for better UX
      setProposal(prev => prev ? {
        ...prev, 
        status: 'rejected',
        review_later_until: null
      } : null);
    }
  };

  const handleArchive = async () => {
    if (!proposal?.id || !user?.id) return;
    
    const result = await archiveProposal(proposal.id, user.id);
    if (result.success) {
      console.log("Proposal archived successfully, refreshing data");
      // Refresh data from the server
      if (id) {
        await fetchProposal(id, token);
      }
      
      // Also update local state immediately for better UX
      setProposal(prev => prev ? {
        ...prev, 
        archived_at: new Date().toISOString(),
        archived_by: user.id,
        review_later_until: null
      } : null);
      
      setArchiveDialogOpen(false);
    }
  };

  const handleReviewLater = async () => {
    if (!proposal?.id) return;
    
    // Toggle review later status
    const isCurrentlyMarkedForReviewLater = !!proposal.review_later_until;
    const result = await toggleReviewLater(proposal.id, isCurrentlyMarkedForReviewLater);
    
    if (result.success) {
      console.log("Review later status updated successfully, refreshing data");
      // Refresh data from the server
      if (id) {
        await fetchProposal(id, token);
      }
      
      // Also update local state immediately for better UX
      setProposal(prev => prev ? {
        ...prev, 
        review_later_until: result.reviewLaterUntil || null
      } : null);
    }
  };

  // Check if the current user can archive this proposal
  const canArchive = !!user && !!proposal && !proposal.archived_at && 
    (user.id === proposal.client_id || user.id === proposal.agent_id);
  
  // Check if the proposal is marked for review later
  const isReviewLater = !!proposal?.review_later_until;
  
  return {
    proposal,
    loading,
    error,
    clientEmail,
    handleApprove,
    handleReject,
    handleArchive,
    handleReviewLater,
    archiveDialogOpen,
    setArchiveDialogOpen,
    archiveLoading: operationLoading.archive,
    canArchive,
    isReviewLater
  };
}
