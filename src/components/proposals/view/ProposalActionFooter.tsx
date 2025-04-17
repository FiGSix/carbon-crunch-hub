
import React, { useState } from "react";
import { X, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { logger } from "@/lib/logger";

interface ProposalActionFooterProps {
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  showActions: boolean;
}

export function ProposalActionFooter({ 
  onApprove, 
  onReject,
  showActions 
}: ProposalActionFooterProps) {
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  if (!showActions) {
    return null;
  }
  
  const handleApprove = async () => {
    try {
      setErrorMessage(null);
      setIsApproving(true);
      logger.info("Starting proposal approval process");
      await onApprove();
      logger.info("Proposal approval completed successfully");
    } catch (error) {
      logger.error("Error during proposal approval:", error);
      setErrorMessage("Failed to approve the proposal. Please try again.");
    } finally {
      setIsApproving(false);
      setShowApproveDialog(false);
    }
  };
  
  const handleReject = async () => {
    try {
      setErrorMessage(null);
      setIsRejecting(true);
      logger.info("Starting proposal rejection process");
      await onReject();
      logger.info("Proposal rejection completed successfully");
    } catch (error) {
      logger.error("Error during proposal rejection:", error);
      setErrorMessage("Failed to reject the proposal. Please try again.");
    } finally {
      setIsRejecting(false);
      setShowRejectDialog(false);
    }
  };
  
  return (
    <>
      {errorMessage && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
      
      <CardFooter className="flex flex-col sm:flex-row gap-4 justify-between border-t pt-6">
        <Button 
          variant="destructive" 
          className="w-full sm:w-auto order-2 sm:order-1"
          onClick={() => setShowRejectDialog(true)}
          disabled={isRejecting || isApproving}
        >
          <X className="mr-2 h-4 w-4" /> Reject Proposal
        </Button>
        <Button 
          variant="default" 
          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 order-1 sm:order-2"
          onClick={() => setShowApproveDialog(true)}
          disabled={isRejecting || isApproving}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" /> Approve Proposal
        </Button>
      </CardFooter>
      
      {/* Approve Confirmation Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Proposal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this proposal? This action indicates your acceptance of the terms and conditions outlined in the proposal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel disabled={isApproving}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={isApproving}
            >
              {isApproving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  Processing...
                </>
              ) : (
                "Yes, Approve"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Reject Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Proposal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this proposal? If you have any questions or would like to discuss modifications, please contact the agent directly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel disabled={isRejecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isRejecting}
            >
              {isRejecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  Processing...
                </>
              ) : (
                "Yes, Reject"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
