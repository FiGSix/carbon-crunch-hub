import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { UserManagementHeader } from '@/components/admin/users/UserManagementHeader';
import { UserManagementTable } from '@/components/admin/users/UserManagementTable';
import { QueryErrorBoundary } from '@/components/common/QueryErrorBoundary';
import { CompanyMigrationTool } from '@/components/admin/users/CompanyMigrationTool';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function AdminUserManagement() {
  const { refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id').limit(1);
      return data;
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <UserManagementHeader />
          <CompanyMigrationTool onSuccess={() => refetch()} />
        </div>
        <QueryErrorBoundary>
          <UserManagementTable />
        </QueryErrorBoundary>
      </div>
    </DashboardLayout>
  );
}
