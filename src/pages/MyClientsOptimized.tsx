

import { useAuth } from '@/contexts/auth';
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientsTable } from '@/components/clients/ClientsTable';
import { useClients } from '@/hooks/clients';

const MyClientsOptimized = () => {
  const { userRole } = useAuth();
  const { 
    clients, 
    isLoading, 
    totalCount,
    error, 
    refresh
  } = useClients({ paginated: false });
  
  const isAdmin = userRole === 'admin';

  if (import.meta.env.DEV) {
    console.log('=== MyClientsOptimized Page Render ===');
    console.log('User Role:', userRole, 'Is Admin:', isAdmin);
    console.log('Loading:', isLoading);
    console.log('Error:', error, 'Clients:', clients.length, 'Total:', totalCount);
  }

  return (
    <DashboardLayout>
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
            {/* Debug info - only shown in development */}
            {import.meta.env.DEV && (
              <div className="text-xs text-gray-400 mt-1 space-x-2">
                <span>Role: {userRole}</span>
                <span>•</span>
                <span>Loading: {isLoading ? 'Yes' : 'No'}</span>
                <span>•</span>
                <span>Clients: {clients.length}/{totalCount}</span>
              </div>
            )}
          </div>
        </div>

        <ClientsTable 
          clients={clients}
          isLoading={isLoading}
          totalCount={totalCount}
          error={error}
          isAdmin={isAdmin}
          onRefresh={refresh}
        />
      </div>
    </DashboardLayout>
  );
};

export default MyClientsOptimized;
