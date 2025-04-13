
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Archive, Clock } from "lucide-react";

interface ProposalStatusBadgeProps {
  status: string;
  isArchived?: boolean;
  reviewLater?: boolean;
}

export function ProposalStatusBadge({ status, isArchived, reviewLater }: ProposalStatusBadgeProps) {
  if (isArchived) {
    return (
      <Badge className="bg-carbon-gray-100 text-carbon-gray-700 hover:bg-carbon-gray-200 flex items-center gap-1">
        <Archive className="h-3 w-3" /> Archived
      </Badge>
    );
  }

  if (reviewLater) {
    return (
      <Badge className="bg-carbon-blue-50 text-carbon-blue-700 hover:bg-carbon-blue-100 flex items-center gap-1">
        <Clock className="h-3 w-3" /> Review Later
      </Badge>
    );
  }

  switch (status) {
    case "approved":
      return <Badge className="bg-carbon-green-100 text-carbon-green-700 hover:bg-carbon-green-200">Approved</Badge>;
    case "pending":
      return <Badge className="bg-carbon-blue-100 text-carbon-blue-700 hover:bg-carbon-blue-200">Pending</Badge>;
    case "rejected":
      return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">Rejected</Badge>;
    case "draft":
      return <Badge className="bg-carbon-gray-100 text-carbon-gray-700 hover:bg-carbon-gray-200">Draft</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}
