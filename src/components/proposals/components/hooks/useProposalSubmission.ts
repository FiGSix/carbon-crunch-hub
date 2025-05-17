import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/services/notificationService";
import { useAuth } from "@/contexts/auth";

interface UseProposalSubmissionProps {
  proposalId: string;
  proposalTitle: string;
  onProposalUpdate?: () => void;
}

export function useProposalSubmission({
  proposalId,
  proposalTitle,
  onProposalUpdate
}: UseProposalSubmissionProps) {
  const { toast } = useToast();
  const { user, userRole } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const submitProposal = async () => {
    try {
      setIsSubmitting(true);
      setErrorDetails(null);
      
      // Robust logging for debugging
      console.log("Submitting proposal for review", { 
        proposalId, 
        userId: user?.id, 
        userRole 
      });
      
      // Validate user and role prerequisites
      if (!user) {
        console.error("No authenticated user found");
        toast({
          title: "Authentication Error",
          description: "Please log in again.",
          variant: "destructive"
        });
        return { success: false, error: "Authentication error" };
      }
      
      if (userRole !== 'agent') {
        console.error("User does not have agent role:", userRole);
        toast({
          title: "Permission Denied",
          description: `Current role (${userRole}) cannot submit proposals`,
          variant: "destructive"
        });
        return { success: false, error: "Permission denied" };
      }
      
      // First, check if the proposal exists and belongs to this agent
      const { data: existingProposal, error: checkError } = await supabase
        .from('proposals')
        .select('id, title, client_id, agent_id, status')
        .eq('id', proposalId)
        .single();
      
      if (checkError || !existingProposal) {
        console.error("Proposal check error:", checkError);
        toast({
          title: "Proposal Error",
          description: "Could not find the specified proposal.",
          variant: "destructive"
        });
        return { success: false, error: checkError?.message || "Proposal not found" };
      }
      
      // Log the existing proposal for debugging
      console.log("Existing proposal:", existingProposal);
      
      if (existingProposal.status !== 'draft') {
        console.error("Proposal is not in draft status:", existingProposal.status);
        toast({
          title: "Invalid Status",
          description: "Only draft proposals can be submitted for review.",
          variant: "destructive"
        });
        return { success: false, error: "Invalid proposal status" };
      }
      
      // Verify that the agent is assigned to this proposal
      if (existingProposal.agent_id !== user.id) {
        console.error("Agent mismatch:", { proposalAgentId: existingProposal.agent_id, userId: user.id });
        toast({
          title: "Permission Denied",
          description: "You are not assigned to this proposal.",
          variant: "destructive"
        });
        return { success: false, error: "You are not assigned to this proposal" };
      }
      
      // Update only the proposal status to 'pending'
      const { data: updateResult, error: updateError } = await supabase
        .from('proposals')
        .update({ 
          status: 'pending'
        })
        .eq('id', proposalId)
        .eq('status', 'draft') // Extra safety check
        .select();
      
      if (updateError) {
        console.error("Proposal update error:", updateError);
        toast({
          title: "Update Failed",
          description: updateError.message,
          variant: "destructive"
        });
        return { success: false, error: updateError.message };
      }
      
      console.log("Proposal successfully updated to pending status:", updateResult);
      
      // Create a notification for proposal submission
      try {
        await createNotification({
          userId: user.id,
          title: "Proposal Submitted",
          message: `Proposal "${proposalTitle}" has been submitted for review.`,
          type: "info",
          relatedId: proposalId,
          relatedType: "proposal"
        });
        console.log("Notification created successfully");
      } catch (notificationError) {
        console.error("Failed to create notification:", notificationError);
        // Continue even if notification fails
      }
      
      // Trigger proposal list refresh if callback provided
      if (onProposalUpdate) {
        onProposalUpdate();
      }
      
      return { success: true };
    } catch (error: any) {
      console.error("Unexpected error in proposal submission:", error);
      setErrorDetails(error.message || "An unexpected error occurred");
      return { success: false, error: error.message || "An unexpected error occurred" };
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper functions to check user status
  const hasAuthIssue = !user;
  const hasRoleIssue = user && userRole !== 'agent';

  return {
    submitProposal,
    isSubmitting,
    errorDetails,
    setErrorDetails,
    hasAuthIssue,
    hasRoleIssue,
    userRole
  };
}
