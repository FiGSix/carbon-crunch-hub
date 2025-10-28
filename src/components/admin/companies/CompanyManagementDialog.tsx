import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAdminCompanyManagement } from '@/hooks/useAdminCompanyManagement';
import { formatDistanceToNow } from 'date-fns';
import { Crown, Users, Clock, CheckCircle, XCircle, ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';

interface CompanyManagementDialogProps {
  companyId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompanyManagementDialog({
  companyId,
  open,
  onOpenChange,
}: CompanyManagementDialogProps) {
  const getUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || '';
  };
  const {
    companyDetails,
    isLoadingDetails,
    promoteToTeamLead,
    demoteFromTeamLead,
    removeMember,
    approveMember,
    declineMember,
    isPromoting,
    isDemoting,
    isRemoving,
    isApproving,
    isDeclining,
  } = useAdminCompanyManagement(companyId || undefined);

  if (!companyId) return null;

  const teamLeads = companyDetails?.members.filter(m => m.role === 'team_lead') || [];
  const regularMembers = companyDetails?.members.filter(m => m.role === 'member') || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Company Management</DialogTitle>
        </DialogHeader>

        {isLoadingDetails ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading company details...</div>
          </div>
        ) : companyDetails ? (
          <ScrollArea className="h-[calc(90vh-120px)]">
            <div className="space-y-6 pr-4">
              {/* Company Overview */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{companyDetails.company_name}</h3>
                {companyDetails.email_domain && (
                  <p className="text-sm text-muted-foreground">Domain: {companyDetails.email_domain}</p>
                )}
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{companyDetails.total_members} members</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    <span>{companyDetails.team_leads} team leads</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{companyDetails.pending} pending</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Team Leads Section */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-600" />
                  Team Leads ({teamLeads.length})
                </h4>
                {teamLeads.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No team leads yet</p>
                ) : (
                  <div className="space-y-2">
                    {teamLeads.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {member.profile?.first_name?.[0]}
                              {member.profile?.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {member.profile?.first_name} {member.profile?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {member.profile?.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              const userId = await getUserId();
                              demoteFromTeamLead({ memberId: member.id, userId });
                            }}
                            disabled={isDemoting || teamLeads.length === 1}
                          >
                            <ArrowDown className="h-4 w-4 mr-1" />
                            Demote
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeMember(member.id)}
                            disabled={isRemoving || teamLeads.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Regular Members Section */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Members ({regularMembers.length})
                </h4>
                {regularMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No members yet</p>
                ) : (
                  <div className="space-y-2">
                    {regularMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {member.profile?.first_name?.[0]}
                              {member.profile?.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {member.profile?.first_name} {member.profile?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {member.profile?.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              const userId = await getUserId();
                              promoteToTeamLead({ memberId: member.id, userId });
                            }}
                            disabled={isPromoting}
                          >
                            <ArrowUp className="h-4 w-4 mr-1" />
                            Promote
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeMember(member.id)}
                            disabled={isRemoving}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Approvals Section */}
              {companyDetails.pendingApprovals.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-600" />
                      Pending Approvals ({companyDetails.pendingApprovals.length})
                    </h4>
                    <div className="space-y-2">
                      {companyDetails.pendingApprovals.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>
                                {member.profile?.first_name?.[0]}
                                {member.profile?.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {member.profile?.first_name} {member.profile?.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {member.profile?.email}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Requested {formatDistanceToNow(new Date(member.invited_at))} ago
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={async () => {
                                const userId = await getUserId();
                                approveMember({ memberId: member.id, userId });
                              }}
                              disabled={isApproving}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => declineMember(member.id)}
                              disabled={isDeclining}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Company not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
