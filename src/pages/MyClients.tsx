

import { useAuth } from '@/contexts/auth';
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientsTable } from '@/components/clients/ClientsTable';
import { useClients } from '@/hooks/clients';

const MyClients = () => {
  const { userRole } = useAuth();
  const { 
    clients, 
    isLoading,
    isLoadingMore,
    hasMore,
    error, 
    totalCount,
    refresh,
    loadMore
  } = useClients({ paginated: true, pageSize: 100 });
  
  const isAdmin = userRole === 'admin';

  return (
    <DashboardLayout>
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-carbon-gray-900">
                {isAdmin ? 'All Clients' : 'My Clients'}
              </h1>
              <p className="text-carbon-gray-600 mt-2">
                {isAdmin 
                  ? 'View all clients across all agents'
                  : 'View your client relationships and project data'
                }
              </p>
            </div>
          </div>

          <ClientsTable 
            clients={clients}
            isLoading={isLoading}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            totalCount={totalCount}
            error={error}
            isAdmin={isAdmin}
            onRefresh={refresh}
            onLoadMore={loadMore}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MyClients;
