import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProposalEngagementBadgeProps {
  engagementCount: number;
  last_engagement_at?: string | null;
  automation_paused?: boolean;
  automation_pause_reason?: string | null;
}

export function ProposalEngagementBadge({ 
  engagementCount, 
  last_engagement_at 
}: ProposalEngagementBadgeProps) {
  if (!engagementCount || engagementCount === 0) return null;

  return (
    <Badge variant="secondary" className="gap-1 text-xs">
      <Eye className="h-3 w-3" />
      <span>{engagementCount}</span>
      {last_engagement_at && (
        <span className="ml-1 text-muted-foreground">
          ({formatDistanceToNow(new Date(last_engagement_at), { addSuffix: true })})
        </span>
      )}
    </Badge>
  );
}
