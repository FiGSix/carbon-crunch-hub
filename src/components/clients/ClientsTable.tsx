
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
}

export function ClientsTable({ 
  clients, 
  isLoading, 
  isRefreshing = false,
  error, 
  isAdmin,
  onRefresh
}: ClientsTableProps) {
  console.log('=== ClientsTable Render ===');
  console.log('State - Loading:', isLoading, 'Refreshing:', isRefreshing);
  console.log('Data - Error:', error, 'Clients:', clients.length);
  console.log('Config - Is Admin:', isAdmin);

  // Show loading skeleton only on initial load
  if (isLoading && clients.length === 0) {
    console.log('Showing loading state (initial load)');
    return <ClientsTableLoading onRefresh={onRefresh} />;
  }

  // Show error state if there's an error and no cached data
  if (error && clients.length === 0) {
    console.log('Showing error state (no cached data)');
    return (
      <ClientsTableError 
        error={error} 
        isRefreshing={isRefreshing} 
        onRefresh={onRefresh} 
      />
    );
  }

  // Show empty state if no clients and no error
  if (clients.length === 0 && !error && !isLoading) {
    console.log('Showing empty state');
    return (
      <ClientsTableEmpty 
        isAdmin={isAdmin}
        isRefreshing={isRefreshing}
        onRefresh={onRefresh}
      />
    );
  }

  // Show content with data (this handles refreshing state while showing data)
  console.log('Showing content with', clients.length, 'clients');
  return (
    <ClientsTableContent 
      clients={clients}
      isAdmin={isAdmin}
      isRefreshing={isRefreshing}
      onRefresh={onRefresh}
      error={error} // Pass error for inline display
    />
  );
}
