
import React, { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/services/notificationService";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const handleSubmitForReview = async () => {
    try {
      setIsSubmitting(true);
      setErrorDetails(null);
      
      // Get the current user to set as the agent
      console.log("Getting current user...");
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error("Auth error:", userError);
        setErrorDetails(`Authentication error: ${userError.message}`);
        throw new Error(`User not authenticated: ${userError.message}`);
      }
      
      if (!user) {
        console.error("No user found");
        setErrorDetails("No authenticated user found");
        throw new Error("User not authenticated");
      }
      
      console.log("Current user ID:", user.id);
      
      // Update the proposal status to "pending" and set the agent_id
      console.log("Updating proposal status...");
      const { data: proposal, error: updateError } = await supabase
        .from('proposals')
        .update({ 
          status: 'pending',
          agent_id: user.id
        })
        .eq('id', proposalId)
        .select('client_id, title')
        .single();
      
      if (updateError) {
        console.error("Update error:", updateError);
        setErrorDetails(`Database update error: ${updateError.message}`);
        throw updateError;
      }
      
      console.log("Proposal updated successfully:", proposal);
      
      // Create a notification for admins (in a real app, you'd target specific admins)
      try {
        console.log("Creating notification...");
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
