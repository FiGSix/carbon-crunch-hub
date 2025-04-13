
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface ProposalData {
  id: string;
  title: string;
  status: string;
  content: any;
  client_id: string;
  agent_id: string | null;
  created_at: string;
  signed_at: string | null;
  invitation_viewed_at: string | null;
  archived_at: string | null;
  archived_by: string | null;
  review_later_until: string | null;
}

export function useViewProposal(id?: string, token?: string | null) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  
  useEffect(() => {
    const fetchProposal = async () => {
      try {
        setLoading(true);
        
        if (token) {
          // Validate the token and get the proposal ID
          const { data: proposalId, error: validationError } = await supabase.rpc('validate_invitation_token', { token });
          
          if (validationError || !proposalId) {
            setError("This invitation link is invalid or has expired.");
            setLoading(false);
            return;
          }
          
          // Mark the invitation as viewed
          await supabase
            .from('proposals')
            .update({ invitation_viewed_at: new Date().toISOString() })
            .eq('invitation_token', token);
          
          // Now fetch the proposal with the validated ID
          const { data, error: fetchError } = await supabase
            .from('proposals')
            .select('*')
            .eq('id', proposalId)
            .single();
          
          if (fetchError) {
            throw fetchError;
          }
          
          setProposal(data);
        } else if (id) {
          // Regular fetch by ID (for authenticated users)
          const { data, error: fetchError } = await supabase
            .from('proposals')
            .select('*')
            .eq('id', id)
            .single();
          
          if (fetchError) {
            throw fetchError;
          }
          
          setProposal(data);
        } else {
          setError("No proposal ID or invitation token provided.");
        }
      } catch (err) {
        console.error("Error fetching proposal:", err);
        setError("Failed to load the proposal. It may have been deleted or you don't have permission to view it.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchProposal();
  }, [id, token]);
  
  const handleApprove = async () => {
    try {
      if (!proposal?.id) return;
      
      const { error } = await supabase
        .from('proposals')
        .update({ 
          status: 'approved',
          signed_at: new Date().toISOString(),
          review_later_until: null // Clear review later if approved
        })
        .eq('id', proposal.id);
      
      if (error) throw error;
      
      toast({
        title: "Proposal Approved",
        description: "Thank you for approving this proposal.",
      });
      
      // Refresh the proposal data
      setProposal(prev => prev ? {
        ...prev, 
        status: 'approved', 
        signed_at: new Date().toISOString(),
        review_later_until: null
      } : null);
    } catch (error) {
      console.error("Error approving proposal:", error);
      toast({
        title: "Error",
        description: "Failed to approve proposal. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleReject = async () => {
    try {
      if (!proposal?.id) return;
      
      const { error } = await supabase
        .from('proposals')
        .update({ 
          status: 'rejected',
          review_later_until: null // Clear review later if rejected
        })
        .eq('id', proposal.id);
      
      if (error) throw error;
      
      toast({
        title: "Proposal Rejected",
        description: "The proposal has been rejected.",
      });
      
      // Refresh the proposal data
      setProposal(prev => prev ? {
        ...prev, 
        status: 'rejected',
        review_later_until: null
      } : null);
    } catch (error) {
      console.error("Error rejecting proposal:", error);
      toast({
        title: "Error",
        description: "Failed to reject proposal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleArchive = async () => {
    try {
      if (!proposal?.id || !user?.id) return;
      
      setArchiveLoading(true);
      
      // Call our archive function
      const { data, error } = await supabase
        .rpc('archive_proposal', { 
          proposal_id: proposal.id, 
          user_id: user.id 
        });
      
      if (error) throw error;
      
      if (!data) {
        throw new Error("Failed to archive proposal. You may not have permission to archive this proposal.");
      }
      
      toast({
        title: "Proposal Archived",
        description: "The proposal has been successfully archived.",
      });
      
      // Update the proposal data locally
      setProposal(prev => prev ? {
        ...prev, 
        archived_at: new Date().toISOString(),
        archived_by: user.id,
        review_later_until: null // Clear review later if archived
      } : null);
      
      setArchiveDialogOpen(false);
    } catch (error) {
      console.error("Error archiving proposal:", error);
      toast({
        title: "Error",
        description: "Failed to archive proposal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleReviewLater = async () => {
    try {
      if (!proposal?.id) return;
      
      // Toggle review later status
      const isCurrentlyMarkedForReviewLater = !!proposal.review_later_until;
      
      // Set review later date to 30 days from now, or null if removing
      const reviewLaterUntil = isCurrentlyMarkedForReviewLater 
        ? null 
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { error } = await supabase
        .from('proposals')
        .update({ review_later_until: reviewLaterUntil })
        .eq('id', proposal.id);
      
      if (error) throw error;
      
      toast({
        title: isCurrentlyMarkedForReviewLater ? "Removed from Review Later" : "Marked for Review Later",
        description: isCurrentlyMarkedForReviewLater 
          ? "This proposal has been removed from your Review Later list." 
          : "This proposal has been added to your Review Later list."
      });
      
      // Update the proposal data locally
      setProposal(prev => prev ? {...prev, review_later_until: reviewLaterUntil} : null);
    } catch (error) {
      console.error("Error updating review later status:", error);
      toast({
        title: "Error",
        description: "Failed to update review status. Please try again.",
        variant: "destructive",
      });
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
    handleApprove,
    handleReject,
    handleArchive,
    handleReviewLater,
    archiveDialogOpen,
    setArchiveDialogOpen,
    archiveLoading,
    canArchive,
    isReviewLater
  };
}
