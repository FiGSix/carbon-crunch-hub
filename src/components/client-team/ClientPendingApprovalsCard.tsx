import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserCheck, UserX, Clock, Mail, X } from 'lucide-react';
import { ClientCompanyMemberWithProfile, ClientTeamInvitation } from '@/lib/supabase/clientCompany/clientCompanyOperations';
import { formatDistanceToNow } from 'date-fns';

interface ClientPendingApprovalsCardProps {
  pendingApprovals: ClientCompanyMemberWithProfile[];
  pendingInvitations: ClientTeamInvitation[];
  isAccountAdmin: boolean;
  onApprove: (memberId: string) => void;
  onDecline: (memberId: string) => void;
  onCancelInvitation: (invitationId: string) => void;
  isApproving: boolean;
  isDeclining: boolean;
  isCancelling: boolean;
}

export function ClientPendingApprovalsCard({
  pendingApprovals,
  pendingInvitations,
  isAccountAdmin,
  onApprove,
  onDecline,
  onCancelInvitation,
  isApproving,
  isDeclining,
  isCancelling,
}: ClientPendingApprovalsCardProps) {
  const totalPending = pendingApprovals.length + pendingInvitations.length;

  if (!isAccountAdmin || totalPending === 0) {
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
          {totalPending} waiting
        </Badge>
      </div>

      <div className="space-y-3">
        {/* Email Invitations */}
        {pendingInvitations.map((invitation) => {
          const fullName = `${invitation.first_name || ''} ${invitation.last_name || ''}`.trim();
          const initials = `${invitation.first_name?.[0] || ''}${invitation.last_name?.[0] || ''}`.toUpperCase();
          const timeAgo = formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true });
          const expiresIn = formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true });

          return (
            <div key={invitation.id} className="flex items-center gap-3 p-3 rounded-lg bg-background border border-blue-200 dark:border-blue-900">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                  {initials || <Mail className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{fullName || 'Invited User'}</p>
                  <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400">
                    <Mail className="h-3 w-3 mr-1" />
                    Invitation Sent
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {invitation.email}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Invited {timeAgo} • Expires {expiresIn}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onCancelInvitation(invitation.id)}
                  disabled={isCancelling}
                  className="gap-1 text-destructive hover:text-destructive"
                  title="Cancel invitation"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          );
        })}

        {/* Pending Member Requests */}
        {pendingApprovals.map((approval) => {
          const fullName = `${approval.profile?.first_name || ''} ${approval.profile?.last_name || ''}`.trim();
          const initials = `${approval.profile?.first_name?.[0] || ''}${approval.profile?.last_name?.[0] || ''}`.toUpperCase();
          const timeAgo = formatDistanceToNow(new Date(approval.invited_at), { addSuffix: true });

          return (
            <div key={approval.id} className="flex items-center gap-3 p-3 rounded-lg bg-background border">
              <Avatar className="h-10 w-10">
                <AvatarFallback>{initials || '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{fullName || 'Unknown'}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {approval.profile?.email}
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
