
import { useMemo, memo } from "react";
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
      case "draft":
        return {
          className: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
          text: "Draft"
        };
      case "sent":
        return {
          className: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
          text: "Sent"
        };
      case "delivered":
        return {
          className: "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100",
          text: "Delivered"
        };
      case "opened":
        return {
          className: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
          text: "Opened"
        };
      case "viewed":
        return {
          className: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
          text: "Viewed"
        };
      case "stale":
        return {
          className: "bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200",
          text: "Stale"
        };
      case "bounced":
        return {
          className: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
          text: "Bounced"
        };
      case "rejected":
        return {
          className: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
          text: "Rejected"
        };
      case "signed":
        return {
          className: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
          text: "Signed"
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

export const ProposalStatusBadge = memo(ProposalStatusBadgeComponent);
