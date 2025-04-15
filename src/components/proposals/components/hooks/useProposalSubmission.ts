
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/services/notificationService";
import { useAuth } from "@/contexts/AuthContext";

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
        return { success: false };
      }
      
      if (userRole !== 'agent') {
        console.error("User does not have agent role:", userRole);
        toast({
          title: "Permission Denied",
          description: `Current role (${userRole}) cannot submit proposals`,
          variant: "destructive"
        });
        return { success: false };
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
        return { success: false };
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
        return { success: false };
      }
      
      // Update the proposal status and set the agent_id
      const { data: updateResult, error: updateError } = await supabase
        .from('proposals')
        .update({ 
          status: 'pending',
          agent_id: user.id
        })
        .eq('id', proposalId)
        .select();
      
      if (updateError) {
        console.error("Proposal update error:", updateError);
        toast({
          title: "Update Failed",
          description: updateError.message,
          variant: "destructive"
        });
        return { success: false };
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
      
      // Show success toast
      toast({
        title: "Success",
        description: "Proposal submitted for review successfully.",
        variant: "default"
      });
      
      return { success: true };
    } catch (error) {
      console.error("Unexpected error in proposal submission:", error);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
      return { success: false };
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
