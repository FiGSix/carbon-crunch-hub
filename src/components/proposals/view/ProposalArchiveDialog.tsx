
import React from "react";
import { Archive } from "lucide-react";
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
import { Button } from "@/components/ui/button";

interface ProposalArchiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onArchive: () => Promise<void>;
  isClient: boolean;
}

export function ProposalArchiveDialog({
  open,
  onOpenChange,
  onArchive,
  isClient
}: ProposalArchiveDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive Proposal</AlertDialogTitle>
          <AlertDialogDescription>
            {isClient
              ? "Are you sure you want to archive this proposal? This will remove it from your active proposals list, but it will still be accessible in archived proposals."
              : "Are you sure you want to archive this proposal? This will mark it as archived for both you and the client. Archived proposals cannot be modified further."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              await onArchive();
            }}
            className="bg-carbon-gray-700 text-white hover:bg-carbon-gray-800"
          >
            <Archive className="mr-2 h-4 w-4" /> Archive Proposal
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
