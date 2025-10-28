import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, Crown, UserCheck } from 'lucide-react';
import { CompanyMemberWithProfile } from '@/lib/supabase/company/companyOperations';

interface TeamMembersCardProps {
  members: CompanyMemberWithProfile[];
  isLoading: boolean;
}

export function TeamMembersCard({ members, isLoading }: TeamMembersCardProps) {
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
        <Badge variant="secondary">
          {activeMembers.length} {activeMembers.length === 1 ? 'member' : 'members'}
        </Badge>
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

            return (
              <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{initials || '?'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{fullName || 'Unknown'}</p>
                    {member.role === 'team_lead' && (
                      <Crown className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {member.profile?.email}
                  </p>
                </div>
                <Badge variant={member.role === 'team_lead' ? 'default' : 'secondary'}>
                  {member.role === 'team_lead' ? 'Team Lead' : 'Member'}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
