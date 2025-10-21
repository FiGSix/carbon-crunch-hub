import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { UserManagementHeader } from '@/components/admin/users/UserManagementHeader';
import { UserManagementTable } from '@/components/admin/users/UserManagementTable';
import { QueryErrorBoundary } from '@/components/common/QueryErrorBoundary';

export default function AdminUserManagement() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <UserManagementHeader />
        <QueryErrorBoundary>
          <UserManagementTable />
        </QueryErrorBoundary>
      </div>
    </DashboardLayout>
  );
}
