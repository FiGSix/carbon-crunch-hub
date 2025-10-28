import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserCheck, UserX, Clock } from 'lucide-react';
import { CompanyMemberWithProfile } from '@/lib/supabase/company/companyOperations';
import { formatDistanceToNow } from 'date-fns';

interface PendingApprovalsCardProps {
  pendingApprovals: CompanyMemberWithProfile[];
  isTeamLead: boolean;
  onApprove: (memberId: string) => void;
  onDecline: (memberId: string) => void;
  isApproving: boolean;
  isDeclining: boolean;
}

export function PendingApprovalsCard({
  pendingApprovals,
  isTeamLead,
  onApprove,
  onDecline,
  isApproving,
  isDeclining,
}: PendingApprovalsCardProps) {
  if (!isTeamLead || pendingApprovals.length === 0) {
    return null;
  }

  return (
    <Card className="p-6 border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-600 dark:text-amber-500" />
          <h3 className="font-semibold text-amber-900 dark:text-amber-100">Pending Approvals</h3>
        </div>
        <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">
          {pendingApprovals.length} waiting
        </Badge>
      </div>

      <div className="space-y-3">
        {pendingApprovals.map((approval) => {
          const fullName = `${approval.profiles.first_name || ''} ${approval.profiles.last_name || ''}`.trim();
          const initials = `${approval.profiles.first_name?.[0] || ''}${approval.profiles.last_name?.[0] || ''}`.toUpperCase();
          const timeAgo = formatDistanceToNow(new Date(approval.invited_at), { addSuffix: true });

          return (
            <div key={approval.id} className="flex items-center gap-3 p-3 rounded-lg bg-background border">
              <Avatar className="h-10 w-10">
                <AvatarFallback>{initials || '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{fullName || 'Unknown'}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {approval.profiles.email}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Requested {timeAgo}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onApprove(approval.id)}
                  disabled={isApproving || isDeclining}
                  className="gap-1"
                >
                  <UserCheck className="h-4 w-4" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDecline(approval.id)}
                  disabled={isApproving || isDeclining}
                  className="gap-1"
                >
                  <UserX className="h-4 w-4" />
                  Decline
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
