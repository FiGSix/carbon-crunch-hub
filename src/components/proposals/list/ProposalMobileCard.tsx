import { memo, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ProposalListItem } from "@/types/proposals";
import { UserRole } from "@/contexts/auth/types";
import { formatSystemSizeForDisplay } from "@/lib/calculations/carbon";
import { ProposalActionButtons } from "../components/ProposalActionButtons";
import { ClientShareCell } from "../components/ClientShareCell";
import { ProposalStatusBadge } from "./ProposalStatusBadge";

interface ProposalMobileCardProps {
  proposal: ProposalListItem;
  userRole: UserRole | null;
  isCurrentUser: boolean;
  onProposalUpdate?: () => void;
}

/** Card representation of a proposal used on small screens instead of the table. */
export const ProposalMobileCard = memo<ProposalMobileCardProps>(({
  proposal,
  userRole,
  isCurrentUser,
  onProposalUpdate,
}) => {
  const formattedDate = useMemo(
    () => new Date(proposal.date).toLocaleDateString(),
    [proposal.date]
  );
  const formattedSize = useMemo(
    () => formatSystemSizeForDisplay(proposal.size),
    [proposal.size]
  );

  return (
    <div
      className={`rounded-lg border p-4 space-y-3 ${
        isCurrentUser ? "bg-carbon-green-50 border-carbon-green-200" : "bg-card"
      }`}
    >
      <div className="space-y-1">
        <p className="font-semibold leading-tight break-words">{proposal.name}</p>
        <p className="text-sm text-muted-foreground break-words">{proposal.client}</p>
      </div>

      <ProposalStatusBadge proposal={proposal} />

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Date</p>
          <p className="flex items-center gap-1.5">
            {formattedDate}
            {proposal.isMultiPhase && (
              <Badge variant="outline" className="text-xs">Multi</Badge>
            )}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Size</p>
          <p>{formattedSize}</p>
        </div>
        {userRole === "admin" && (
          <div>
            <p className="text-xs text-muted-foreground">Agent</p>
            <p className="break-words">{proposal.agent || "Unassigned"}</p>
          </div>
        )}
        {userRole === "admin" && (
          <div>
            <p className="text-xs text-muted-foreground">Client Share</p>
            <ClientShareCell proposal={proposal} />
          </div>
        )}
      </div>

      <div className="pt-1 border-t">
        <ProposalActionButtons proposal={proposal} onProposalUpdate={onProposalUpdate} />
      </div>
    </div>
  );
});

ProposalMobileCard.displayName = "ProposalMobileCard";
