import { Badge } from '@/components/ui/badge';
import { ProposalListItem } from '@/types/proposals';

interface ClientShareCellProps {
  proposal: ProposalListItem;
}

export function ClientShareCell({ proposal }: ClientShareCellProps) {
  const percentage = proposal.client_share_percentage || 0;
  const isOverride = proposal.client_share_override_enabled;

  return (
    <div className="flex items-center gap-2">
      <span className="font-medium">{percentage.toFixed(1)}%</span>
      {isOverride ? (
        <Badge variant="outline" className="text-xs">
          Override
        </Badge>
      ) : (
        <Badge variant="secondary" className="text-xs">
          Auto
        </Badge>
      )}
    </div>
  );
}
