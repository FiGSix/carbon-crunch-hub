
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

export function SubmitForReviewButton({ proposalId, proposalTitle, onProposalUpdate }: SubmitForReviewButtonProps) {
  const { toast } = useToast();
  const { user, userRole, refreshUser } = useAuth(); // Get auth context for more reliable user info
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const handleSubmitForReview = async () => {
    try {
      setIsSubmitting(true);
      setErrorDetails(null);
      
      // Use user from Auth context instead of fetching it again
      if (!user) {
        console.error("No authenticated user found in context");
        setErrorDetails("No authenticated user found. Please try logging out and back in.");
        throw new Error("User not authenticated");
      }
      
      if (userRole !== 'agent') {
        console.error("User does not have agent role:", userRole);
        setErrorDetails(`User does not have agent role. Current role: ${userRole || 'none'}`);
        throw new Error("User must be an agent to submit proposals");
      }
      
      console.log("Current user ID:", user.id, "Role:", userRole);
      
      // First, check if the proposal exists before updating
      console.log("Verifying proposal exists...", proposalId);
      const { data: existingProposal, error: checkError } = await supabase
        .from('proposals')
        .select('id, title, client_id')
        .eq('id', proposalId)
        .maybeSingle();
      
      if (checkError) {
        console.error("Error checking proposal:", checkError);
        setErrorDetails(`Error verifying proposal: ${checkError.message}`);
        throw new Error(`Error verifying proposal: ${checkError.message}`);
      }
      
      if (!existingProposal) {
        console.error("No proposal found with ID:", proposalId);
        setErrorDetails(`Proposal not found with ID: ${proposalId}`);
        throw new Error(`Proposal not found with ID: ${proposalId}`);
      }
      
      console.log("Found proposal to update:", existingProposal);
      
      // Update the proposal status to "pending" and set the agent_id
      console.log("Updating proposal status...");
      const { error: updateError } = await supabase
        .from('proposals')
        .update({ 
          status: 'pending',
          agent_id: user.id
        })
        .eq('id', proposalId);
      
      if (updateError) {
        console.error("Update error:", updateError);
        
        // Detailed error information for RLS or other database issues
        if (updateError.code === "42501" || updateError.message.includes("permission denied")) {
          setErrorDetails(`Database permission error: You don't have permission to update this proposal. This may be due to Row Level Security issues.`);
        } else {
          setErrorDetails(`Database update error: ${updateError.message}`);
        }
        
        throw updateError;
      }
      
      console.log("Proposal updated successfully. Creating notification...");
      
      // Create a notification for admins
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
        // Don't throw here, just log the error - we don't want notification failure to block the submission
        console.error("Error creating notification:", notificationError);
        // Continue execution - the proposal was updated successfully
      }
      
      toast({
        title: "Success",
        description: "Proposal has been submitted for review.",
        variant: "default",
      });
      
      // Refresh the proposals list
      if (onProposalUpdate) {
        console.log("Triggering proposal list refresh");
        onProposalUpdate();
      }
    } catch (error) {
      console.error("Error submitting proposal for review:", error);
      
      // Show more detailed error info to the user
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Error",
        description: `Failed to submit proposal for review: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setDialogOpen(false);
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
