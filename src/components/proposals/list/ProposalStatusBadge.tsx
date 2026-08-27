import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";
import { EmailEngagementBadge } from "../components/EmailEngagementBadge";
import { ProposalEngagementBadge } from "./ProposalEngagementBadge";
import { ProposalListItem } from "@/types/proposals";

interface ProposalStatusBadgeProps {
  proposal: ProposalListItem;
}

/**
 * Single source of truth for the proposal status badge stack.
 * Used by both the desktop table row and the mobile card.
 */
export function ProposalStatusBadge({ proposal }: ProposalStatusBadgeProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {proposal.audit_ready ? (
        <Badge variant="outline" className="gap-1 text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
          Audit
        </Badge>
      ) : proposal.submitted_for_review ? (
        <Badge variant="outline" className="gap-1 text-xs bg-violet-50 text-violet-700 border-violet-200">
          Review
        </Badge>
      ) : proposal.onboarding_complete ? (
        <Badge variant="outline" className="gap-1 text-xs bg-cyan-50 text-cyan-700 border-cyan-200">
          Onboarding
        </Badge>
      ) : proposal.signed_at ? (
        <Badge variant="outline" className="gap-1 text-xs bg-purple-50 text-purple-700 border-purple-200">
          <CheckCircle2 className="h-3 w-3" />
          Signed
        </Badge>
      ) : proposal.status === 'approved' ? (
        <Badge variant="outline" className="gap-1 text-xs bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="h-3 w-3" />
          Approved
        </Badge>
      ) : proposal.status === 'rejected' ? (
        <Badge variant="outline" className="gap-1 text-xs bg-red-50 text-red-700 border-red-200">
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      ) : proposal.status === 'stale' ? (
        <Badge variant="outline" className="gap-1 text-xs bg-gray-100 text-gray-500 border-gray-300">
          Stale
        </Badge>
      ) : proposal.last_email_event_type ? (
        <EmailEngagementBadge
          eventType={proposal.last_email_event_type}
          sentAt={proposal.last_email_sent_at}
        />
      ) : proposal.invitation_sent_at ? (
        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
          Sent
        </Badge>
      ) : (
        <Badge variant="secondary" className="text-xs">
          Draft
        </Badge>
      )}

      {proposal.engagement_count > 0 &&
        !proposal.signed_at &&
        proposal.status !== 'approved' &&
        proposal.status !== 'rejected' && (
          <ProposalEngagementBadge
            engagementCount={proposal.engagement_count}
            last_engagement_at={proposal.last_engagement_at}
          />
        )}
    </div>
  );
}
