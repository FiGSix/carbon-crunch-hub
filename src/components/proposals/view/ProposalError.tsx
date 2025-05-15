
import React from "react";
import { ErrorDisplay, ErrorDisplayProps } from "@/components/ui/error-display";

interface ProposalErrorProps {
  errorMessage: string;
  showArchiveError?: boolean;
  onRetry?: () => void;
}

export function ProposalError({ errorMessage, showArchiveError, onRetry }: ProposalErrorProps) {
  const errorProps: ErrorDisplayProps = {
    title: showArchiveError ? "Archive Error" : "Proposal Error",
    message: errorMessage,
    severity: "error",
    backPath: "/",
    onRetry: onRetry,
    className: "max-w-5xl mx-auto"
  };
  
  return (
    <div className="container px-4 py-12">
      <ErrorDisplay {...errorProps} />
    </div>
  );
}

