
import React from "react";
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

interface SubmitForReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  errorDetails: string | null;
}

export function SubmitForReviewDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  errorDetails
}: SubmitForReviewDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
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
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onSubmit}
            className="retro-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
