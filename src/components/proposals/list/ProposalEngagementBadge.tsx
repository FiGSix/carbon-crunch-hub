import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProposalEngagementBadgeProps {
  engagementCount: number;
  lastEngagementAt?: string | null;
}

export function ProposalEngagementBadge({ 
  engagementCount, 
  lastEngagementAt 
}: ProposalEngagementBadgeProps) {
  if (!engagementCount || engagementCount === 0) return null;

  return (
    <Badge variant="secondary" className="gap-1 text-xs">
      <Eye className="h-3 w-3" />
      <span>{engagementCount}</span>
      {lastEngagementAt && (
        <span className="ml-1 text-muted-foreground">
          ({formatDistanceToNow(new Date(lastEngagementAt), { addSuffix: true })})
        </span>
      )}
    </Badge>
  );
}
