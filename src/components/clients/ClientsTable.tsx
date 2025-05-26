
import React from 'react';
import { ClientData } from '@/hooks/useMyClients';
import { ClientsTableLoading } from './table/ClientsTableLoading';
import { ClientsTableError } from './table/ClientsTableError';
import { ClientsTableEmpty } from './table/ClientsTableEmpty';
import { ClientsTableContent } from './table/ClientsTableContent';

interface ClientsTableProps {
  clients: ClientData[];
  isLoading: boolean;
  isRefreshing?: boolean;
  error: string | null;
  isAdmin: boolean;
  onRefresh?: () => void;
  autoRefreshEnabled?: boolean;
}

export function ClientsTable({ 
  clients, 
  isLoading, 
  isRefreshing = false,
  error, 
  isAdmin,
  onRefresh,
  autoRefreshEnabled = false
}: ClientsTableProps) {
  console.log('=== ClientsTable Render ===');
  console.log('Props - Loading:', isLoading, 'Refreshing:', isRefreshing, 'Error:', error, 'Clients:', clients.length, 'Auto-refresh:', autoRefreshEnabled);

  if (isLoading) {
    return <ClientsTableLoading onRefresh={onRefresh} />;
  }

  if (error) {
    return (
      <ClientsTableError 
        error={error} 
        isRefreshing={isRefreshing} 
        onRefresh={onRefresh} 
      />
    );
  }

  if (clients.length === 0) {
    return (
      <ClientsTableEmpty 
        isAdmin={isAdmin}
        isRefreshing={isRefreshing}
        autoRefreshEnabled={autoRefreshEnabled}
        onRefresh={onRefresh}
      />
    );
  }

  return (
    <ClientsTableContent 
      clients={clients}
      isAdmin={isAdmin}
      isRefreshing={isRefreshing}
      autoRefreshEnabled={autoRefreshEnabled}
      onRefresh={onRefresh}
    />
  );
}
