import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TeamMembersCard } from '@/components/team/TeamMembersCard';
import { PendingApprovalsCard } from '@/components/team/PendingApprovalsCard';
import { useCompanyManagement } from '@/hooks/useCompanyManagement';
import { Card } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

export default function TeamManagement() {
  const {
    company,
    members,
    pendingApprovals,
    pendingInvitations,
    isTeamLead,
    isLoading,
    approveMember,
    declineMember,
    inviteByEmail,
    cancelInvitation,
    resendInvitation,
    removeMember,
    isApproving,
    isDeclining,
    isInviting,
    isCancelling,
    isResending,
    isRemoving,
  } = useCompanyManagement();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Team Management</h1>
          <p className="text-muted-foreground">
            Manage your company team members and collaboration
          </p>
        </div>

        {company && (
          <Card className="p-6 bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <h2 className="text-xl font-semibold">{company.company_name}</h2>
                {company.email_domain && (
                  <p className="text-sm text-muted-foreground">
                    Domain: @{company.email_domain}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        <PendingApprovalsCard
          pendingApprovals={pendingApprovals}
          pendingInvitations={pendingInvitations}
          isTeamLead={isTeamLead}
          onApprove={approveMember}
          onDecline={declineMember}
          onCancelInvitation={cancelInvitation}
          onResendInvitation={resendInvitation}
          isApproving={isApproving}
          isDeclining={isDeclining}
          isCancelling={isCancelling}
          isResending={isResending}
        />

        <TeamMembersCard
          members={members}
          isLoading={isLoading}
          isTeamLead={isTeamLead}
          onInvite={inviteByEmail}
          onRemove={removeMember}
          isInviting={isInviting}
          isRemoving={isRemoving}
        />
      </div>
    </DashboardLayout>
  );
}
