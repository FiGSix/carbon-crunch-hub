import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ClientTeamMembersCard } from '@/components/client-team/ClientTeamMembersCard';
import { ClientPendingApprovalsCard } from '@/components/client-team/ClientPendingApprovalsCard';
import { useClientCompanyManagement } from '@/hooks/useClientCompanyManagement';
import { Card } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

export default function ClientTeamManagement() {
  const {
    company,
    members,
    pendingApprovals,
    pendingInvitations,
    isAccountAdmin,
    isLoading,
    approveMember,
    declineMember,
    inviteByEmail,
    cancelInvitation,
    removeMember,
    updateSigningPermission,
    isApproving,
    isDeclining,
    isInviting,
    isCancelling,
    isRemoving,
    isUpdatingPermission,
  } = useClientCompanyManagement();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Team Management</h1>
          <p className="text-muted-foreground">
            Manage your company team members and access permissions
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

        <ClientPendingApprovalsCard
          pendingApprovals={pendingApprovals}
          pendingInvitations={pendingInvitations}
          isAccountAdmin={isAccountAdmin}
          onApprove={approveMember}
          onDecline={declineMember}
          onCancelInvitation={cancelInvitation}
          isApproving={isApproving}
          isDeclining={isDeclining}
          isCancelling={isCancelling}
        />

        <ClientTeamMembersCard
          members={members}
          isLoading={isLoading}
          isAccountAdmin={isAccountAdmin}
          onInvite={inviteByEmail}
          onRemove={removeMember}
          onUpdateSigningPermission={updateSigningPermission}
          isInviting={isInviting}
          isRemoving={isRemoving}
          isUpdatingPermission={isUpdatingPermission}
        />
      </div>
    </DashboardLayout>
  );
}
