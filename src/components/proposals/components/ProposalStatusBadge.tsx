
import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Archive, Clock } from "lucide-react";

interface ProposalStatusBadgeProps {
  status: string;
  isArchived?: boolean;
  reviewLater?: boolean;
}

function ProposalStatusBadgeComponent({ status, isArchived, reviewLater }: ProposalStatusBadgeProps) {
  if (isArchived) {
    return (
      <Badge 
        variant="outline" 
        className="bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 flex items-center gap-1"
      >
        <Archive className="h-3 w-3" /> Archived
      </Badge>
    );
  }

  if (reviewLater) {
    return (
      <Badge 
        variant="outline" 
        className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 flex items-center gap-1"
      >
        <Clock className="h-3 w-3" /> Review Later
      </Badge>
    );
  }

  const badgeConfig = useMemo(() => {
    switch (status) {
      case "approved":
        return {
          className: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
          text: "Approved"
        };
      case "pending":
        return {
          className: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
          text: "Pending"
        };
      case "rejected":
        return {
          className: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
          text: "Rejected"
        };
      case "draft":
        return {
          className: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
          text: "Draft"
        };
      default:
        return {
          className: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
          text: status
        };
    }
  }, [status]);

  return (
    <Badge 
      variant="outline" 
      className={badgeConfig.className}
    >
      {badgeConfig.text}
    </Badge>
  );
}

export const ProposalStatusBadge = React.memo(ProposalStatusBadgeComponent);
