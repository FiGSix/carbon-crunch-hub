import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Users, Crown, UserPlus, Trash2, PenLine } from 'lucide-react';
import { ClientCompanyMemberWithProfile } from '@/lib/supabase/clientCompany/clientCompanyOperations';
import { InviteClientTeamMemberDialog } from './InviteClientTeamMemberDialog';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/auth';

interface ClientTeamMembersCardProps {
  members: ClientCompanyMemberWithProfile[];
  isLoading: boolean;
  isAccountAdmin: boolean;
  onInvite: (data: { email: string; firstName?: string; lastName?: string }) => void;
  onRemove: (memberId: string) => void;
  onUpdateSigningPermission: (data: { memberId: string; canSign: boolean }) => void;
  isInviting: boolean;
  isRemoving: boolean;
  isUpdatingPermission: boolean;
}

export function ClientTeamMembersCard({ 
  members, 
  isLoading, 
  isAccountAdmin, 
  onInvite, 
  onRemove,
  onUpdateSigningPermission,
  isInviting,
  isRemoving,
  isUpdatingPermission
}: ClientTeamMembersCardProps) {
  const { user } = useAuth();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<ClientCompanyMemberWithProfile | null>(null);

  const handleInvite = (data: { email: string; firstName?: string; lastName?: string }) => {
    onInvite(data);
    setInviteDialogOpen(false);
  };

  const handleRemoveClick = (member: ClientCompanyMemberWithProfile) => {
    setMemberToRemove(member);
    setRemoveDialogOpen(true);
  };

  const handleRemoveConfirm = () => {
    if (memberToRemove) {
      onRemove(memberToRemove.id);
      setRemoveDialogOpen(false);
      setMemberToRemove(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Team Members</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-muted rounded mb-2" />
                <div className="h-3 w-48 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const activeMembers = members.filter(m => m.status === 'active');

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Team Members</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {activeMembers.length} {activeMembers.length === 1 ? 'member' : 'members'}
          </Badge>
          {isAccountAdmin && (
            <Button
              size="sm"
              onClick={() => setInviteDialogOpen(true)}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Invite Member
            </Button>
          )}
        </div>
      </div>

      {activeMembers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No team members yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeMembers.map((member) => {
            const fullName = `${member.profile?.first_name || ''} ${member.profile?.last_name || ''}`.trim();
            const initials = `${member.profile?.first_name?.[0] || ''}${member.profile?.last_name?.[0] || ''}`.toUpperCase();
            const canRemove = isAccountAdmin && member.role !== 'account_admin' && member.user_id !== user?.id;
            const canEditPermissions = isAccountAdmin && member.role !== 'account_admin';

            return (
              <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{initials || '?'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{fullName || 'Unknown'}</p>
                    {member.role === 'account_admin' && (
                      <Crown className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {member.profile?.email}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Signing Permission Toggle */}
                  {canEditPermissions && (
                    <div className="flex items-center gap-2">
                      <PenLine className="h-4 w-4 text-muted-foreground" />
                      <Switch
                        checked={member.can_sign_agreements}
                        onCheckedChange={(checked) => 
                          onUpdateSigningPermission({ memberId: member.id, canSign: checked })
                        }
                        disabled={isUpdatingPermission}
                        title="Can sign agreements"
                      />
                    </div>
                  )}
                  <Badge variant={member.role === 'account_admin' ? 'default' : 'secondary'}>
                    {member.role === 'account_admin' ? 'Admin' : 'Member'}
                  </Badge>
                  {member.can_sign_agreements && (
                    <Badge variant="outline" className="border-green-500 text-green-600">
                      Can Sign
                    </Badge>
                  )}
                  {canRemove && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveClick(member)}
                      disabled={isRemoving}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <InviteClientTeamMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInvite={handleInvite}
        isInviting={isInviting}
      />

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <span className="font-semibold">
                {memberToRemove?.profile?.first_name} {memberToRemove?.profile?.last_name}
              </span>{' '}
              from the team? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveConfirm}
              disabled={isRemoving}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isRemoving ? 'Removing...' : 'Remove Member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
