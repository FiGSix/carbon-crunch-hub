
import React, { useState } from "react";
import { Send, AlertTriangle } from "lucide-react";
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
    const result = await submitProposal();
    if (result.success) {
      setDialogOpen(false);
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
        disabled={isSubmitting}
      >
        Submit <Send className="h-4 w-4 ml-1" />
      </Button>
      
      <SubmitForReviewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmitForReview}
        isSubmitting={isSubmitting}
        errorDetails={errorDetails}
      />
    </>
  );
}
