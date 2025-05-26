
import React from "react";
import { FileText, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProposalPDFStatusProps {
  status: string;
  pdfUrl?: string;
}

export function ProposalPDFStatus({ status, pdfUrl }: ProposalPDFStatusProps) {
  const getStatusInfo = () => {
    switch (status) {
      case 'completed':
        return {
          icon: <CheckCircle className="h-3 w-3" />,
          label: 'PDF Ready',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'generating':
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          label: 'Generating',
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      case 'failed':
        return {
          icon: <XCircle className="h-3 w-3" />,
          label: 'Failed',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-200'
        };
      default:
        return {
          icon: <FileText className="h-3 w-3" />,
          label: 'Pending',
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <Badge 
      variant={statusInfo.variant}
      className={`text-xs ${statusInfo.className}`}
    >
      {statusInfo.icon}
      <span className="ml-1">{statusInfo.label}</span>
    </Badge>
  );
}
