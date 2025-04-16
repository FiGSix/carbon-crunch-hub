
import React, { useState } from "react";
import { X, CheckCircle2, Loader2 } from "lucide-react";
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
  
  if (!showActions) {
    return null;
  }
  
  const handleApprove = async () => {
    try {
      setIsApproving(true);
      await onApprove();
    } finally {
      setIsApproving(false);
      setShowApproveDialog(false);
    }
  };
  
  const handleReject = async () => {
    try {
      setIsRejecting(true);
      await onReject();
    } finally {
      setIsRejecting(false);
      setShowRejectDialog(false);
    }
  };
  
  return (
    <>
      <CardFooter className="flex flex-col sm:flex-row gap-4 justify-between border-t pt-6">
        <Button 
          variant="destructive" 
          className="w-full sm:w-auto"
          onClick={() => setShowRejectDialog(true)}
        >
          <X className="mr-2 h-4 w-4" /> Reject Proposal
        </Button>
        <Button 
          variant="default" 
          className="w-full sm:w-auto bg-green-500 hover:bg-green-600"
          onClick={() => setShowApproveDialog(true)}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" /> Approve Proposal
        </Button>
      </CardFooter>
      
      {/* Approve Confirmation Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Proposal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this proposal? This action indicates your acceptance of the terms and conditions outlined in the proposal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApproving}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleApprove}
              className="bg-green-500 hover:bg-green-600"
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Proposal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this proposal? If you have any questions or would like to discuss modifications, please contact the agent directly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
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
