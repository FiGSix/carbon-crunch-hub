

import { useAuth } from '@/contexts/auth';
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientsTable } from '@/components/clients/ClientsTable';
import { useClientsPaginated } from '@/hooks/clients/useClientsPaginated';
import { useEffect } from 'react';

const MyClients = () => {
  const { userRole } = useAuth();
  const { 
    clients, 
    isLoading, 
    isLoadingMore,
    hasMore,
    totalCount,
    error, 
    loadMore,
    refresh
  } = useClientsPaginated();
  
  const isAdmin = userRole === 'admin';

  // Fix 3: Enhanced loading state debugging
  useEffect(() => {
    console.log('⏰ Loading state changed:', {
      isLoading,
      isLoadingMore,
      clientsCount: clients.length,
      totalCount,
      hasError: !!error,
      hasMore,
      timestamp: new Date().toISOString()
    });
  }, [isLoading, isLoadingMore, clients.length, totalCount, error, hasMore]);

  console.log('=== MyClients Page Render ===');
  console.log('User Role:', userRole, 'Is Admin:', isAdmin);
  console.log('Loading:', isLoading, 'LoadingMore:', isLoadingMore, 'HasMore:', hasMore);
  console.log('Error:', error, 'Clients:', clients.length, 'Total:', totalCount);
  console.log('Raw clients data:', clients);
  
  // Additional render condition debugging
  console.log('Will render ClientsTable?', true);
  console.log('ClientsTable props being passed:', {
    clients,
    isLoading,
    isLoadingMore,
    hasMore,
    totalCount,
    error,
    isAdmin,
    onRefresh: !!refresh,
    onLoadMore: !!loadMore
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
                <span>LoadingMore: {isLoadingMore ? 'Yes' : 'No'}</span>
                <span>•</span>
                <span>Clients: {clients.length}/{totalCount}</span>
                <span>•</span>
                <span>HasMore: {hasMore ? 'Yes' : 'No'}</span>
              </div>
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
