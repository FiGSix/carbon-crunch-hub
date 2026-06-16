import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PartnerManagementHeader } from '@/components/admin/agents/PartnerManagementHeader';
import { PartnersTable } from '@/components/admin/agents/PartnersTable';
import { QueryErrorBoundary } from '@/components/common/QueryErrorBoundary';

export default function AdminAgentManagement() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PartnerManagementHeader />
        <QueryErrorBoundary>
          <PartnersTable />
        </QueryErrorBoundary>
      </div>
    </DashboardLayout>
  );
}
