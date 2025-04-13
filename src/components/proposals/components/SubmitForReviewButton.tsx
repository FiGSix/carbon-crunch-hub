
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

  const handleSubmitForReview = async () => {
    try {
      setIsSubmitting(true);
      
      // Get the current user to set as the agent
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Update the proposal status to "pending" and set the agent_id
      const { data: proposal, error } = await supabase
        .from('proposals')
        .update({ 
          status: 'pending',
          agent_id: user.id
        })
        .eq('id', proposalId)
        .select('client_id, title')
        .single();
      
      if (error) throw error;
      
      // Create a notification for admins (in a real app, you'd target specific admins)
      // For demo purposes, we'll create a notification for the agent themselves
      await createNotification({
        userId: user.id,
        title: "Proposal Submitted",
        message: `Proposal "${proposalTitle}" has been submitted for review.`,
        type: "info",
        relatedId: proposalId,
        relatedType: "proposal"
      });
      
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
      toast({
        title: "Error",
        description: "Failed to submit proposal for review.",
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
        className="text-carbon-blue-600"
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
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSubmitForReview}
              className="bg-carbon-green-500 hover:bg-carbon-green-600 text-white"
            >
              Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
