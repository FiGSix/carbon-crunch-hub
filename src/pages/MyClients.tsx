
import React from 'react';
import { useAuth } from '@/contexts/auth';
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientsTable } from '@/components/clients/ClientsTable';
import { useMyClients } from '@/hooks/useMyClients';

const MyClients = () => {
  const { userRole } = useAuth();
  const { clients, isLoading, error } = useMyClients();
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
            error={error}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MyClients;
