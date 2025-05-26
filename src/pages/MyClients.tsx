
import React from 'react';
import { useAuth } from '@/contexts/auth';
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientsTable } from '@/components/clients/ClientsTable';
import { ClientsSettings } from '@/components/clients/ClientsSettings';
import { useMyClients } from '@/hooks/useMyClients';

const MyClients = () => {
  const { userRole } = useAuth();
  const { 
    clients, 
    isLoading, 
    isRefreshing, 
    error, 
    refreshClients,
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    refreshInterval,
    setRefreshInterval
  } = useMyClients();
  const isAdmin = userRole === 'admin';

  console.log('=== MyClients Page Render ===');
  console.log('User Role:', userRole);
  console.log('Is Admin:', isAdmin);
  console.log('Loading:', isLoading);
  console.log('Refreshing:', isRefreshing);
  console.log('Error:', error);
  console.log('Clients:', clients);
  console.log('Auto-refresh enabled:', autoRefreshEnabled);

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
              {/* Debug info */}
              <div className="text-xs text-gray-400 mt-1">
                Role: {userRole} | Loading: {isLoading ? 'Yes' : 'No'} | Refreshing: {isRefreshing ? 'Yes' : 'No'} | Clients: {clients.length} | Auto-refresh: {autoRefreshEnabled ? 'On' : 'Off'}
              </div>
            </div>
            
            <ClientsSettings
              autoRefreshEnabled={autoRefreshEnabled}
              onAutoRefreshChange={setAutoRefreshEnabled}
              refreshInterval={refreshInterval}
              onRefreshIntervalChange={setRefreshInterval}
            />
          </div>

          <ClientsTable 
            clients={clients}
            isLoading={isLoading}
            isRefreshing={isRefreshing}
            error={error}
            isAdmin={isAdmin}
            onRefresh={refreshClients}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MyClients;
