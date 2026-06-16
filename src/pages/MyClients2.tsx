import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SimpleClientsTable2 } from '@/components/clients/SimpleClientsTable2';
import { ClientsTableSkeleton } from '@/components/clients/ClientsTableSkeleton';
import { useClients } from '@/hooks/clients';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { AccessNotEnabled } from '@/components/common/AccessNotEnabled';

export default function MyClients2() {
  const { userRole, profile } = useAuth();

  if (profile?.role === 'super_partner' && !profile?.can_create_proposals) {
    return (
      <DashboardLayout>
        <AccessNotEnabled
          title="Access not enabled"
          description="Direct client management is not enabled on your account. Please contact your administrator to request access."
        />
      </DashboardLayout>
    );
  }


  const { 
    clients, 
    isLoading, 
    isLoadingMore,
    hasMore,
    error, 
    refresh,
    loadMore,
    totalCount
  } = useClients({ paginated: true, pageSize: 50 });

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Clients</h1>
            <p className="text-muted-foreground mt-2">
              Manage your client relationships and projects
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <ClientsTableSkeleton rows={10} isAdmin={userRole === 'admin'} />
        ) : (
          <SimpleClientsTable2 
            clients={clients} 
            onRefresh={refresh}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            totalCount={totalCount}
            onLoadMore={loadMore}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
