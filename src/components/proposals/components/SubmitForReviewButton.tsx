
import React, { useState } from "react";
import { Send, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useProposalSubmission } from "./hooks/useProposalSubmission";
import { SubmitForReviewDialog } from "./SubmitForReviewDialog";

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  const {
    submitProposal,
    isSubmitting,
    errorDetails,
    setErrorDetails,
    hasAuthIssue,
    hasRoleIssue,
    userRole
  } = useProposalSubmission({
    proposalId,
    proposalTitle,
    onProposalUpdate
  });

  const handleSubmitForReview = async () => {
    setProcessing(true);
    try {
      console.log("Submitting proposal for review", { proposalId });
      const result = await submitProposal();
      if (result.success) {
        setDialogOpen(false);
        toast({
          title: "Proposal Submitted",
          description: "Proposal has been submitted for review. You can now send an invitation to the client.",
        });
        // Trigger parent component's update function if provided
        if (onProposalUpdate) {
          onProposalUpdate();
        }
      } else {
        console.error("Submission failed:", result.error || "Unknown error");
        toast({
          title: "Submission Failed",
          description: result.error || "There was an error submitting the proposal. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Unexpected error during submission:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during submission.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Show a special error if no user is found
  if (hasAuthIssue) {
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
  if (hasRoleIssue) {
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
        disabled={isSubmitting || processing}
      >
        {isSubmitting || processing ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Submitting...
          </>
        ) : (
          <>
            Submit <Send className="h-4 w-4 ml-1" />
          </>
        )}
      </Button>
      
      <SubmitForReviewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmitForReview}
        isSubmitting={isSubmitting || processing}
        errorDetails={errorDetails}
      />
    </>
  );
}
