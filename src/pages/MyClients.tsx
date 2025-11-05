

import { useAuth } from '@/contexts/auth';
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientsTable } from '@/components/clients/ClientsTable';
import { useClients } from '@/hooks/clients';
import { useEffect } from 'react';

const MyClients = () => {
  const { userRole } = useAuth();
  const { 
    clients, 
    isLoading, 
    error, 
    totalCount,
    refresh
  } = useClients({ paginated: false });
  
  const isAdmin = userRole === 'admin';

  // Fix 3: Enhanced loading state debugging
  useEffect(() => {
    console.log('⏰ Loading state changed:', {
      isLoading,
      clientsCount: clients.length,
      totalCount,
      hasError: !!error,
      timestamp: new Date().toISOString()
    });
  }, [isLoading, clients.length, totalCount, error]);

  console.log('=== MyClients Page Render ===');
  console.log('User Role:', userRole, 'Is Admin:', isAdmin);
  console.log('Loading:', isLoading);
  console.log('Error:', error, 'Clients:', clients.length, 'Total:', totalCount);
  console.log('Raw clients data:', clients);
  
  // Additional render condition debugging
  console.log('Will render ClientsTable?', true);
  console.log('ClientsTable props being passed:', {
    clients,
    isLoading,
    totalCount,
    error,
    isAdmin,
    onRefresh: !!refresh
  });

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
              {/* Debug info - can be removed in production */}
              <div className="text-xs text-gray-400 mt-1 space-x-2">
                <span>Role: {userRole}</span>
                <span>•</span>
                <span>Loading: {isLoading ? 'Yes' : 'No'}</span>
                <span>•</span>
                <span>Clients: {clients.length}/{totalCount}</span>
              </div>
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
      </div>
    </DashboardLayout>
  );
};

export default MyClients;
