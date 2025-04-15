
import React, { useState } from "react";
import { Send, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/services/notificationService";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SubmitForReviewButtonProps {
  proposalId: string;
  proposalTitle: string;
  onProposalUpdate?: () => void;
}

export function SubmitForReviewButton({ 
  proposalId, 
  proposalTitle, 
  onProposalUpdate 
}: SubmitForReviewButtonProps) {
  const { toast } = useToast();
  const { user, userRole, refreshUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const handleSubmitForReview = async () => {
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
        return;
      }
      
      if (userRole !== 'agent') {
        console.error("User does not have agent role:", userRole);
        toast({
          title: "Permission Denied",
          description: `Current role (${userRole}) cannot submit proposals`,
          variant: "destructive"
        });
        return;
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
        return;
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
        return;
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
        return;
      }
      
      console.log("Update result:", updateResult);
      
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
      
      // Close dialog
      setDialogOpen(false);
    } catch (error) {
      console.error("Unexpected error in proposal submission:", error);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show a special error if no user is found
  if (!user) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => toast({
          title: "Authentication Error",
          description: "You are not properly authenticated. Please try logging out and back in.",
          variant: "destructive",
        })}
        className="retro-button"
      >
        <AlertTriangle className="h-4 w-4 mr-1" /> Auth Issue
      </Button>
    );
  }

  // Show a special error if user is not an agent
  if (userRole !== 'agent') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => toast({
          title: "Permission Error",
          description: `You must have agent role to submit proposals. Current role: ${userRole || 'none'}`,
          variant: "destructive",
        })}
        className="retro-button"
      >
        <AlertTriangle className="h-4 w-4 mr-1" /> Role Issue
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogOpen(true)}
        className="retro-button"
        disabled={isSubmitting}
      >
        Submit <Send className="h-4 w-4 ml-1" />
      </Button>
      
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Proposal for Review</AlertDialogTitle>
            <AlertDialogDescription>
              This will change the proposal status to "Pending" and make it available for client invitation.
              Are you sure you want to submit this proposal for review?
              {errorDetails && (
                <div className="mt-2 text-red-500 text-sm border border-red-200 bg-red-50 p-2 rounded">
                  <strong>Previous error: </strong>{errorDetails}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSubmitForReview}
              className="retro-button"
            >
              Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
